import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// LOI signature persistence — the Supabase replacement for the signature-upload
// side of forward-docs-to-salesforce. Uploads the signed PNG to the private
// dossier-documents bucket (audit copy) AND records it as a documenten row on
// the main tenant, so the signed LOI is part of the dossier record rather than
// an orphan file. Service-role because the bucket is private (anon can't write).

const BUCKET = 'dossier-documents';

function admin() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase service-role credentials not configured');
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { phone, signatureBase64, signatureDate } = body || {};
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits) {
            return NextResponse.json({ success: false, message: 'phone is required' }, { status: 400 });
        }
        if (!signatureBase64) {
            return NextResponse.json({ success: false, message: 'signatureBase64 is required' }, { status: 400 });
        }
        const supabase = admin();
        const candidates = [...new Set([phone, `+${digits}`, digits, String(phone).replace(/\s+/g, '')])].filter(Boolean);

        // Canonical phone = the account's whatsapp_number (keeps dossier lookups consistent).
        const { data: accMatch } = await supabase
            .from('accounts').select('whatsapp_number').in('whatsapp_number', candidates).limit(1);
        const canonicalPhone = accMatch?.[0]?.whatsapp_number || `+${digits}`;

        // Upload the signature PNG (audit copy).
        const stamp = (signatureDate || new Date().toISOString()).replace(/[:.]/g, '-');
        const path = `${digits}/loi/signature-${stamp}.png`;
        const bytes = Buffer.from(signatureBase64, 'base64');
        const { error: upErr } = await supabase.storage
            .from(BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: true });
        if (upErr) throw new Error('signature upload: ' + upErr.message);

        // Link it to the dossier's main tenant as a documenten row (best-effort —
        // if the dossier/persoon isn't found we still keep the audit copy).
        let linked = false;
        const { data: dossier } = await supabase
            .from('dossiers').select('id').eq('phone_number', canonicalPhone)
            .order('created_at', { ascending: false }).limit(1);
        const dossierId = dossier?.[0]?.id;
        if (dossierId) {
            const { data: persoon } = await supabase
                .from('personen').select('id')
                .eq('dossier_id', dossierId).eq('rol', 'Hoofdhuurder').limit(1);
            const persoonId = persoon?.[0]?.id;
            if (persoonId) {
                // Replace any prior signature so re-signing doesn't pile up rows.
                await supabase.from('documenten')
                    .delete().eq('persoon_id', persoonId).eq('type', 'loi_signature');
                const { error: dErr } = await supabase.from('documenten').insert({
                    persoon_id: persoonId,
                    type: 'loi_signature',
                    bestandsnaam: 'signature.png',
                    bestandspad: path,
                    status: 'ontvangen',
                    phone_number: canonicalPhone,
                });
                if (!dErr) linked = true;
            }
        }

        return NextResponse.json({ success: true, path, linked });
    } catch (err) {
        console.error('[dossier/signature POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
