import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { encodeBase64, decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// Forwards aanvraag/LOI submissions to the Salesforce unified webhook.
//
// The caller (the form) sends the full personen list inline — each persoon
// carries the documents they're about to submit, with bucket paths pointing
// at the actual files. Salesforce is the source of truth for who/what is on
// a dossier; this function is just the postman that ships the bytes.
//
// One HTTP call per document so we never hit Salesforce's request-body limit,
// followed by one `documents_complete` summary that lists every document
// the caller sent.

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

// Doc payload shape sent by the form. `file_path` is the storage path
// inside the dossier-documents bucket (no bucket prefix).
interface InlineDoc {
    type: string;
    file_path: string;
    file_name?: string | null;
    status?: string | null;
}

interface InlinePerson {
    name?: string | null;
    rol?: string | null; // Dutch role from the form (Hoofdhuurder, etc.)
    role?: string | null; // SF-style role, if the caller pre-mapped it
    phone_number?: string | null;
    email?: string | null;
    werkstatus?: string | null;
    inkomen?: number | string | null;
    adres?: string | null;
    postcode?: string | null;
    woonplaats?: string | null;
    documenten?: InlineDoc[] | null;
}

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
    // uploaded to dossier-documents (private, audit copy) and the same
    // bytes are forwarded inline to Salesforce so SF can ingest+store the
    // image without any public URL ever being minted. signature_date
    // defaults to the request timestamp.
    signature_image_base64?: string | null;
    signature_date?: string | null;
    // Identifies which page on the website fired the webhook. Salesforce
    // can use this to differentiate the partial-application submit
    // ("aanvraag") from the signed-LOI submit ("letterofintent").
    trigger_source?: string | null;
    // Personen + their documents, as held in the form's React state. This
    // is the authoritative list for the submission — we no longer query
    // Supabase metadata tables to discover who/what to send.
    personen?: InlinePerson[] | null;
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
        const personenInput = Array.isArray(body.personen) ? body.personen : [];

        if (!phone_number) {
            return json({ success: false, error: "Missing phone_number" }, 400);
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Resolve or create the accounts row. Accounts is the only Supabase
        // metadata we still touch — it carries the salesforce_account_id and
        // the cross-event batch_id that ties aanvraag + LOI together.
        let apartment_id: string = body.apartment_id ?? "";
        let storedBatchId: string | null = null;

        if (!account_id) {
            const normalized = phone_number.replace(/\s+/g, "");
            const { data: existing, error: lookupErr } = await supabase
                .from("accounts")
                .select("id, salesforce_account_id, apartment_selected, last_salesforce_batch_id")
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
                storedBatchId = (existing as any).last_salesforce_batch_id ?? null;
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
                .select("salesforce_account_id, apartment_selected, last_salesforce_batch_id")
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
            storedBatchId = (row as any)?.last_salesforce_batch_id ?? null;
        }

        // Aanvraag and the follow-up letterofintent submission must share the
        // same batch_id so Salesforce can correlate them as one transaction.
        // Aanvraag mints a fresh id and persists it on the accounts row; later
        // triggers (letterofintent) read it back. If a non-aanvraag trigger
        // runs without a stored id (e.g. someone signs an LOI without ever
        // submitting the aanvraag), we fall back to a fresh id rather than
        // failing.
        let batchId: string;
        if (triggerSource === "aanvraag") {
            batchId = `${account_id}-${Date.now()}`;
            const { error: persistErr } = await supabase
                .from("accounts")
                .update({ last_salesforce_batch_id: batchId })
                .eq("id", account_id);
            if (persistErr) {
                console.warn(
                    `[forward-docs] Failed to persist batch_id on accounts row ${account_id}: ${persistErr.message}`
                );
            }
        } else if (storedBatchId) {
            batchId = storedBatchId;
            console.log(
                `[forward-docs] Reusing batch_id from accounts row ${account_id} for trigger=${triggerSource}: ${batchId}`
            );
        } else {
            batchId = `${account_id}-${Date.now()}`;
            console.warn(
                `[forward-docs] No stored batch_id on accounts row ${account_id} for trigger=${triggerSource}; minting fresh id ${batchId}`
            );
        }
        const timestamp = new Date().toISOString();

        // Optional signature handling (LOI submit only). Upload the PNG to
        // private storage as an audit copy, and forward the same bytes
        // inline as base64 so Salesforce can ingest+store the image without
        // any public URL or long-lived signed URL existing anywhere. If no
        // signature was supplied, all fields are empty/zero.
        let signature_image_base64 = "";
        let signature_image_mime_type = "";
        let signature_image_size = 0;
        let signature_image_path = "";
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
                signature_image_base64 = body.signature_image_base64;
                signature_image_mime_type = "image/png";
                signature_image_size = sigBytes.byteLength;
                signature_image_path = `${BUCKET}/${sigPath}`;
                console.log(`[forward-docs] Signature uploaded: ${sigPath} (${signature_image_size} bytes)`);
            } catch (sigErr: any) {
                console.error("[forward-docs] Signature upload failed:", sigErr.message);
            }
        }

        // Flatten the inline personen → docs into the per-doc work list, and
        // build the accompanying summary entries. We keep the person object
        // beside each doc so we can attach it to the per-doc payload below.
        type DocWithPerson = {
            doc: InlineDoc;
            person: InlinePerson;
        };
        const allDocs: DocWithPerson[] = [];
        for (const person of personenInput) {
            const docs = Array.isArray(person.documenten) ? person.documenten : [];
            for (const doc of docs) {
                if (!doc?.file_path) continue;
                allDocs.push({ doc, person });
            }
        }
        const withFiles = allDocs.filter((entry) => entry.doc.file_path && entry.doc.file_path.trim() !== "");

        console.log(
            `[forward-docs] account=${account_id} phone=${phone_number} personen=${personenInput.length} total_docs=${allDocs.length} with_files=${withFiles.length}`
        );

        const personMeta = (p: InlinePerson) => {
            const dutchRole = p.rol || "";
            const sfRole = p.role || roleMap[dutchRole] || dutchRole || "";
            return {
                name: (p.name || "").trim(),
                phone_number: p.phone_number ?? null,
                email: p.email ?? "",
                werkstatus: p.werkstatus ?? "",
                inkomen: p.inkomen ?? 0,
                adres: p.adres ?? "",
                postcode: p.postcode ?? "",
                woonplaats: p.woonplaats ?? "",
                role: sfRole,
            };
        };

        const results: Array<{ id: string; ok: boolean; status: number; error?: string }> = [];

        for (let i = 0; i < withFiles.length; i++) {
            const { doc, person } = withFiles[i];

            let fileBase64: string | null = null;
            let fileSize = 0;
            let mimeType = "application/pdf";
            const fileName =
                doc.file_name ||
                doc.file_path.split("/").pop() ||
                `${doc.type}.pdf`;
            // Use the storage path as a stable per-doc identifier in the response,
            // since we no longer have a documenten.id to point at.
            const docId = doc.file_path;

            try {
                const { data: fileBlob, error: dlError } = await supabase.storage
                    .from(BUCKET)
                    .download(doc.file_path);

                if (dlError || !fileBlob) {
                    throw new Error(dlError?.message || "File download returned empty");
                }

                mimeType = fileBlob.type || mimeType;
                const buf = new Uint8Array(await fileBlob.arrayBuffer());
                fileSize = buf.byteLength;
                fileBase64 = encodeBase64(buf);
            } catch (dlErr: any) {
                console.warn(
                    `[forward-docs] Download failed for ${doc.file_path}: ${dlErr.message}`
                );
                results.push({
                    id: docId,
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
                signature_image_base64,
                signature_image_mime_type,
                signature_image_size,
                signature_image_path,
                signature_date,
                timestamp,
                updated_at: timestamp,
                document: {
                    id: docId,
                    type: doc.type,
                    status: doc.status || "ontvangen",
                    file_name: fileName,
                    file_path: `${BUCKET}/${doc.file_path}`,
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
                signature_image_base64: signature_image_base64
                    ? `<${signature_image_size} bytes redacted>`
                    : "",
                document: {
                    ...payload.document,
                    file_base64: `<${fileSize} bytes redacted>`,
                },
            };
            console.log(
                `[forward-docs] REQUEST doc ${i + 1}/${withFiles.length} ${docId}: ${JSON.stringify(loggablePayload)}`
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
                    id: docId,
                    ok: res.ok,
                    status: res.status,
                    error: res.ok ? undefined : text.slice(0, 200),
                });
                console.log(
                    `[forward-docs] RESPONSE doc ${i + 1}/${withFiles.length} ${docId} -> ${res.status} ${res.ok ? "OK" : text.slice(0, 500)}`
                );
            } catch (fetchErr: any) {
                results.push({
                    id: docId,
                    ok: false,
                    status: 0,
                    error: `fetch_failed: ${fetchErr.message}`,
                });
            }
        }

        // Metadata-only summary built from the inline personen list. SF gets
        // the full snapshot of what the form just submitted, so any persons
        // or documents the form removed since the last submit are simply
        // absent from this payload.
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
            signature_image_base64,
            signature_image_mime_type,
            signature_image_size,
            signature_image_path,
            signature_date,
            timestamp,
            updated_at: timestamp,
            documents: allDocs.map(({ doc, person }) => ({
                id: doc.file_path,
                type: doc.type,
                status: doc.status || "ontvangen",
                file_name: doc.file_name || doc.file_path.split("/").pop() || `${doc.type}.pdf`,
                file_path: doc.file_path ? `${BUCKET}/${doc.file_path}` : null,
                person: personMeta(person),
            })),
        };

        const loggableSummary = {
            ...summaryPayload,
            signature_image_base64: signature_image_base64
                ? `<${signature_image_size} bytes redacted>`
                : "",
        };
        console.log(
            `[forward-docs] REQUEST summary batch=${batchId}: ${JSON.stringify(loggableSummary)}`
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
            docs_total: allDocs.length,
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
