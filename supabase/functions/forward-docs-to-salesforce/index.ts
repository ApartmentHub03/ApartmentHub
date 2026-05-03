import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { encodeBase64, decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// Forwards all documents for an account to the Salesforce unified webhook.
// Invoked by the DB trigger `trigger_salesforce_documents_complete_webhook`
// whenever accounts.documentation_status flips to 'Complete'.
//
// One HTTP call per document so we never hit Salesforce's request-body limit.
// Each call carries the document's PDF bytes as base64 plus the same person &
// dossier metadata shipped in the original migration.
//
// Column names map to the *live* schema (Dutch):
//   documenten.bestandspad   -> file_path in payload
//   documenten.bestandsnaam  -> file_name in payload
//   personen.voornaam/achternaam -> person.name
//   personen.telefoon        -> person.phone_number

const SALESFORCE_URL =
    "https://apartmenthub--hubdev.sandbox.my.salesforce-sites.com/services/apexrest/unified/webhook?source=AptHub";
const BUCKET = "dossier-documents";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-forwarder-secret",
};

const roleMap: Record<string, string> = {
    Hoofdhuurder: "main_tenant",
    Medehuurder: "co_tenant",
    Garantsteller: "guarantor",
};

interface TriggerPayload {
    account_id?: string | null;
    tenant_name: string | null;
    phone_number: string | null;
    email?: string | null;
    salesforce_account_id?: string | null;
    apartment_id?: string | null;
    apartment_name?: string | null;
    property_address?: string | null;
    bid_amount?: number | null;
    start_date?: string | null;
    motivation?: string | null;
    months_advance?: number | null;
    // Signature payload — only sent on the LOI submit. The base64 PNG is
    // uploaded to dossier-documents and a 10-year signed URL is added to
    // the SF payload. signature_date defaults to the request timestamp.
    signature_image_base64?: string | null;
    signature_date?: string | null;
    // Identifies which page on the website fired the webhook. Salesforce
    // can use this to differentiate the partial-application submit
    // ("aanvraag") from the signed-LOI submit ("letterofintent").
    trigger_source?: string | null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body: TriggerPayload = await req.json();
        const phone_number = body.phone_number;
        const tenant_name = body.tenant_name ?? "";
        let account_id = body.account_id ?? null;
        let salesforce_account_id = body.salesforce_account_id ?? "";
        const triggerSource = body.trigger_source || "aanvraag";
        const email = body.email ?? "";
        const apartment_name = body.apartment_name ?? "";
        const property_address = body.property_address ?? "";
        const bid_amount = body.bid_amount ?? 0;
        const start_date = body.start_date ?? "";
        const motivation = body.motivation ?? "";
        const months_advance = body.months_advance ?? 0;

        if (!phone_number) {
            return json({ success: false, error: "Missing phone_number" }, 400);
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Resolve or create the accounts row server-side. We do this here
        // (inside the edge function on Supabase's own network) instead of
        // in the Next.js API route so local Node networking issues don't
        // affect the call. Zoko/CRM can later enrich the same row by
        // whatsapp_number — accounts.account_role allows 'tenant' |
        // 'co-tenant' | 'guarantor', so we use 'tenant' for self-provisioned rows.
        let apartment_id: string = body.apartment_id ?? "";

        if (!account_id) {
            const normalized = phone_number.replace(/\s+/g, "");
            const { data: existing, error: lookupErr } = await supabase
                .from("accounts")
                .select("id, salesforce_account_id, apartment_selected")
                .or(`whatsapp_number.eq.${normalized},whatsapp_number.eq.${phone_number}`)
                .limit(1)
                .maybeSingle();
            if (lookupErr) {
                console.warn("[forward-docs] Account lookup error:", lookupErr.message);
            }
            if (existing?.id) {
                account_id = existing.id;
                if (!salesforce_account_id && existing.salesforce_account_id) {
                    salesforce_account_id = existing.salesforce_account_id;
                }
                if (!apartment_id) {
                    const sel = (existing as any).apartment_selected;
                    if (Array.isArray(sel) && sel[0]?.apartment_id) {
                        apartment_id = sel[0].apartment_id;
                    }
                }
            } else {
                const { data: created, error: insertErr } = await supabase
                    .from("accounts")
                    .insert({
                        whatsapp_number: phone_number,
                        tenant_name: tenant_name,
                        documentation_status: "Complete",
                        account_role: "tenant",
                    })
                    .select("id")
                    .single();
                if (insertErr || !created) {
                    return json({
                        success: false,
                        error: `Could not provision account: ${insertErr?.message || "unknown"}`,
                    }, 500);
                }
                account_id = created.id;
                console.log("[forward-docs] Lazy-created accounts row:", account_id);
            }
        } else {
            const { data: row } = await supabase
                .from("accounts")
                .select("salesforce_account_id, apartment_selected")
                .eq("id", account_id)
                .maybeSingle();
            if (row?.salesforce_account_id && !salesforce_account_id) {
                salesforce_account_id = row.salesforce_account_id;
            }
            if (!apartment_id) {
                const sel = (row as any)?.apartment_selected;
                if (Array.isArray(sel) && sel[0]?.apartment_id) {
                    apartment_id = sel[0].apartment_id;
                }
            }
        }

        const { data: rows, error } = await supabase
            .from("documenten")
            .select(
                "id, type, status, bestandsnaam, bestandspad, personen!inner(id, voornaam, achternaam, telefoon, rol, dossier_id, dossiers!inner(id, phone_number, updated_at))"
            )
            .eq("personen.dossiers.phone_number", phone_number);

        if (error) {
            console.error("[forward-docs] Query failed:", error);
            return json({ success: false, error: error.message }, 500);
        }

        const docs = rows ?? [];
        const batchId = `${account_id}-${Date.now()}`;
        const timestamp = new Date().toISOString();
        // Pull the dossier's updated_at as the canonical "last edit" time.
        // Falls back to the request timestamp if the join didn't surface it.
        const dossierUpdatedAt =
            (docs[0] as any)?.personen?.dossiers?.updated_at || timestamp;

        // Optional signature handling (LOI submit only). Upload the PNG to
        // dossier-documents and mint a 10-year signed URL so Salesforce can
        // fetch it on demand. If no signature was supplied, both fields are "".
        let signature_image_url = "";
        const signature_date = body.signature_date || (body.signature_image_base64 ? timestamp : "");
        if (body.signature_image_base64) {
            try {
                const sigPath = `${phone_number.replace(/\D/g, "")}/loi/signature-${Date.now()}.png`;
                const sigBytes = decodeBase64(body.signature_image_base64);
                const { error: upErr } = await supabase.storage
                    .from(BUCKET)
                    .upload(sigPath, sigBytes, {
                        contentType: "image/png",
                        upsert: true,
                    });
                if (upErr) throw upErr;
                const tenYearsSec = 10 * 365 * 24 * 60 * 60;
                const { data: signed, error: signErr } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(sigPath, tenYearsSec);
                if (signErr) throw signErr;
                signature_image_url = signed?.signedUrl || "";
                console.log(`[forward-docs] Signature uploaded: ${sigPath}`);
            } catch (sigErr: any) {
                console.error("[forward-docs] Signature upload failed:", sigErr.message);
            }
        }
        const withFiles = docs.filter(
            (d: any) => d.bestandspad && d.bestandspad.trim() !== ""
        );

        console.log(
            `[forward-docs] account=${account_id} phone=${phone_number} total_docs=${docs.length} with_files=${withFiles.length}`
        );

        const personMeta = (p: any) => ({
            name: [p.voornaam, p.achternaam].filter(Boolean).join(" ").trim(),
            phone_number: p.telefoon,
            role: roleMap[p.rol] ?? p.rol,
            server_id: p.dossiers?.id ?? p.dossier_id,
        });

        const results: Array<{ id: string; ok: boolean; status: number; error?: string }> = [];

        for (let i = 0; i < withFiles.length; i++) {
            const d: any = withFiles[i];
            const person = d.personen;

            let fileBase64: string | null = null;
            let fileSize = 0;
            let mimeType = "application/pdf";
            const fileName =
                d.bestandsnaam ||
                d.bestandspad.split("/").pop() ||
                `${d.type}.pdf`;

            try {
                const { data: fileBlob, error: dlError } = await supabase.storage
                    .from(BUCKET)
                    .download(d.bestandspad);

                if (dlError || !fileBlob) {
                    throw new Error(dlError?.message || "File download returned empty");
                }

                mimeType = fileBlob.type || mimeType;
                const buf = new Uint8Array(await fileBlob.arrayBuffer());
                fileSize = buf.byteLength;
                fileBase64 = encodeBase64(buf);
            } catch (dlErr: any) {
                console.warn(
                    `[forward-docs] Download failed for ${d.bestandspad}: ${dlErr.message}`
                );
                results.push({
                    id: d.id,
                    ok: false,
                    status: 0,
                    error: `download_failed: ${dlErr.message}`,
                });
                continue;
            }

            const payload = {
                source: "AptHub",
                trigger_source: triggerSource,
                event_type: "document_file",
                batch_id: batchId,
                batch_index: i + 1,
                batch_total: withFiles.length,
                account_id,
                apartment_id,
                apartment_name,
                tenant_name,
                phone_number,
                email,
                salesforce_account_id,
                property_address,
                bid_amount,
                start_date,
                motivation,
                months_advance,
                signature_image_url,
                signature_date,
                timestamp,
                updated_at: dossierUpdatedAt,
                document: {
                    id: d.id,
                    type: d.type,
                    status: d.status,
                    file_name: fileName,
                    file_path: `${BUCKET}/${d.bestandspad}`,
                    file_mime_type: mimeType,
                    file_size: fileSize,
                    file_base64: fileBase64,
                },
                person: personMeta(person),
            };

            // Log the outgoing payload (with base64 redacted) so production
            // failures can be diagnosed from edge-function logs.
            const loggablePayload = {
                ...payload,
                document: {
                    ...payload.document,
                    file_base64: `<${fileSize} bytes redacted>`,
                },
            };
            console.log(
                `[forward-docs] REQUEST doc ${i + 1}/${withFiles.length} ${d.id}: ${JSON.stringify(loggablePayload)}`
            );

            try {
                const res = await fetch(SALESFORCE_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Supabase-Salesforce-Documents-Forwarder",
                    },
                    body: JSON.stringify(payload),
                });
                const text = await res.text();
                results.push({
                    id: d.id,
                    ok: res.ok,
                    status: res.status,
                    error: res.ok ? undefined : text.slice(0, 200),
                });
                console.log(
                    `[forward-docs] RESPONSE doc ${i + 1}/${withFiles.length} ${d.id} -> ${res.status} ${res.ok ? "OK" : text.slice(0, 500)}`
                );
            } catch (fetchErr: any) {
                results.push({
                    id: d.id,
                    ok: false,
                    status: 0,
                    error: `fetch_failed: ${fetchErr.message}`,
                });
            }
        }

        // Metadata-only summary matching the original migration shape.
        const summaryPayload = {
            source: "AptHub",
            trigger_source: triggerSource,
            event_type: "documents_complete",
            batch_id: batchId,
            account_id,
            apartment_id,
            apartment_name,
            tenant_name,
            phone_number,
            email,
            salesforce_account_id,
            property_address,
            bid_amount,
            start_date,
            motivation,
            months_advance,
            signature_image_url,
            signature_date,
            timestamp,
            updated_at: dossierUpdatedAt,
            documents: docs.map((d: any) => ({
                id: d.id,
                type: d.type,
                status: d.status,
                file_name: d.bestandsnaam,
                file_path: d.bestandspad ? `${BUCKET}/${d.bestandspad}` : null,
                person: personMeta(d.personen),
            })),
        };

        console.log(
            `[forward-docs] REQUEST summary batch=${batchId}: ${JSON.stringify(summaryPayload)}`
        );

        let summary: { status: number; ok: boolean; error?: string };
        try {
            const res = await fetch(SALESFORCE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Supabase-Salesforce-Documents-Forwarder",
                },
                body: JSON.stringify(summaryPayload),
            });
            const text = await res.text();
            summary = {
                ok: res.ok,
                status: res.status,
                error: res.ok ? undefined : text.slice(0, 200),
            };
            console.log(
                `[forward-docs] RESPONSE summary batch=${batchId} -> ${res.status} ${res.ok ? "OK" : text.slice(0, 500)}`
            );
        } catch (e: any) {
            summary = { ok: false, status: 0, error: `summary_fetch_failed: ${e.message}` };
            console.error(
                `[forward-docs] RESPONSE summary batch=${batchId} -> FETCH_FAILED ${e.message}`
            );
        }

        return json({
            success: true,
            batch_id: batchId,
            account_id,
            docs_total: docs.length,
            docs_with_files: withFiles.length,
            results,
            summary,
        });
    } catch (err: any) {
        console.error("[forward-docs] Unexpected error:", err);
        return json({ success: false, error: err.message ?? String(err) }, 500);
    }
});

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
    });
}
