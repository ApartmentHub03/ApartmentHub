import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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
    account_id: string;
    tenant_name: string | null;
    phone_number: string | null;
    salesforce_account_id: string | null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body: TriggerPayload = await req.json();
        const { account_id, tenant_name, phone_number, salesforce_account_id } = body;

        if (!account_id || !phone_number) {
            return json({ success: false, error: "Missing account_id or phone_number" }, 400);
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: rows, error } = await supabase
            .from("documenten")
            .select(
                "id, type, status, bestandsnaam, bestandspad, personen!inner(id, voornaam, achternaam, telefoon, rol, dossier_id, dossiers!inner(id, phone_number))"
            )
            .eq("personen.dossiers.phone_number", phone_number);

        if (error) {
            console.error("[forward-docs] Query failed:", error);
            return json({ success: false, error: error.message }, 500);
        }

        const docs = rows ?? [];
        const batchId = `${account_id}-${Date.now()}`;
        const timestamp = new Date().toISOString();
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
                event_type: "document_file",
                batch_id: batchId,
                batch_index: i + 1,
                batch_total: withFiles.length,
                account_id,
                tenant_name,
                phone_number,
                salesforce_account_id,
                timestamp,
                document: {
                    id: d.id,
                    type: d.type,
                    status: d.status,
                    file_name: fileName,
                    file_path: d.bestandspad,
                    file_mime_type: mimeType,
                    file_size: fileSize,
                    file_base64: fileBase64,
                },
                person: personMeta(person),
            };

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
                    `[forward-docs] doc ${i + 1}/${withFiles.length} ${d.id} -> ${res.status}`
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
            event_type: "documents_complete",
            batch_id: batchId,
            account_id,
            tenant_name,
            phone_number,
            salesforce_account_id,
            timestamp,
            documents: docs.map((d: any) => ({
                id: d.id,
                type: d.type,
                status: d.status,
                file_name: d.bestandsnaam,
                file_path: d.bestandspad,
                person: personMeta(d.personen),
            })),
        };

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
        } catch (e: any) {
            summary = { ok: false, status: 0, error: `summary_fetch_failed: ${e.message}` };
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
