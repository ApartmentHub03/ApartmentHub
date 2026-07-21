import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Incremental document persistence for the /aanvraag flow.
//
// The main Aanvraag form uploads files to Storage immediately but only writes
// `documenten` rows on final submit (/api/dossier/save). Until submit, the CRM
// dashboard sees no documents. The InviteForm tries to write `documenten` via
// the browser client, but no INSERT RLS policy exists on the table so it
// silently fails. This service-role route closes that gap: it persists (or
// removes) a `documenten` row right after each Storage operation so the CRM
// reflects uploads in real time.
//
// The sync_accounts_from_dossier_data() trigger fires on every
// documenten INSERT/UPDATE/DELETE, recomputing accounts.documents JSONB and
// accounts.documentation_status automatically — so no manual accounts update
// is needed here.
//
// POST   → upsert document(s) for one persoon + docType
// DELETE → remove document(s) for one persoon + docType

function admin() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase service-role credentials not configured');
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

const TYPE_BY_ROLE = { Hoofdhuurder: 'tenant', Medehuurder: 'co_tenant', Garantsteller: 'guarantor' };

function splitName(naam) {
    const parts = String(naam || '').trim().split(/\s+/);
    if (parts.length <= 1) return { voornaam: parts[0] || '', achternaam: '' };
    return { voornaam: parts[0], achternaam: parts.slice(1).join(' ') };
}

function phoneCandidates(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    return [...new Set([phone, `+${digits}`, digits, String(phone).replace(/\s+/g, '')])].filter(Boolean);
}

// Resolve the canonical dossier phone from an existing accounts row, or fall
// back to the raw phone. Mirrors /api/dossier/save's approach so the
// sync trigger (which matches accounts.whatsapp_number = dossiers.phone_number)
// reliably fires.
async function resolveCanonicalPhone(supabase, phone) {
    const candidates = phoneCandidates(phone);
    if (!candidates.length) return null;
    const { data: accMatch } = await supabase
        .from('accounts').select('whatsapp_number').in('whatsapp_number', candidates).limit(1);
    return accMatch?.[0]?.whatsapp_number || `+${String(phone).replace(/\D/g, '')}`;
}

// Find the dossier by canonical phone (most recent if multiple). If none
// exists yet (uploads before the first /api/dossier/save submit), lazy-create
// one so the upload persists immediately. The eventual /api/dossier/save will
// upsert the same row keyed on phone_number — no orphaned dossiers.
async function resolveDossier(supabase, canonicalPhone) {
    const { data } = await supabase
        .from('dossiers').select('id').eq('phone_number', canonicalPhone)
        .order('created_at', { ascending: false }).limit(1);
    if (data?.[0]?.id) return data[0].id;

    const { data: created, error } = await supabase
        .from('dossiers')
        .insert({ phone_number: canonicalPhone, status: 'draft' })
        .select('id').single();
    if (error) throw error;
    return created.id;
}

// Find a personen row in a dossier by phone, falling back to name match.
async function resolvePersoon(supabase, dossierId, persoonPhone, persoonName) {
    if (!dossierId) return null;
    if (persoonPhone) {
        const digits = String(persoonPhone).replace(/\D/g, '');
        const candidates = [...new Set([persoonPhone, `+${digits}`, digits])].filter(Boolean);
        const { data } = await supabase
            .from('personen').select('id').eq('dossier_id', dossierId).in('telefoon', candidates).limit(1);
        if (data?.[0]) return data[0].id;
    }
    if (persoonName) {
        const { data } = await supabase
            .from('personen').select('id, voornaam, achternaam, naam').eq('dossier_id', dossierId);
        const target = String(persoonName).trim().toLowerCase();
        const match = (data || []).find((p) => {
            const full = `${p.voornaam || ''} ${p.achternaam || ''}`.trim().toLowerCase();
            return full === target || (p.naam || '').trim().toLowerCase() === target;
        });
        if (match) return match.id;
    }
    return null;
}

// Lazy-create a personen row when the form hasn't been submitted yet (no
// personen row exists for this person). Same fields as /api/dossier/save.
async function lazyCreatePersoon(supabase, dossierId, { role, naam, telefoon, email, werkstatus }) {
    const { voornaam, achternaam } = splitName(naam);
    const type = TYPE_BY_ROLE[role] || 'tenant';
    const row = {
        dossier_id: dossierId,
        type,
        rol: role || null,
        voornaam, achternaam,
        email: email || null,
        telefoon: telefoon || null,
        werk_status: werkstatus || null,
    };
    const { data, error } = await supabase.from('personen').insert(row).select('id').single();
    if (error) throw error;
    return data.id;
}

// POST — persist document row(s) after a Storage upload.
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            phone, persoonId, persoonPhone, persoonName,
            role, naam, werkstatus, email,
            docType, files, replace,
        } = body || {};

        if (!phone) {
            return NextResponse.json({ success: false, message: 'phone is required' }, { status: 400 });
        }
        if (!docType || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json({ success: false, message: 'docType and files are required' }, { status: 400 });
        }

        const supabase = admin();

        // 1. Resolve the persoon — either by direct id (InviteForm path) or by
        //    phone/name lookup within the dossier (Aanvraag path).
        let pid = null;
        if (persoonId) {
            const { data: existing, error: pErr } = await supabase
                .from('personen').select('id').eq('id', persoonId).maybeSingle();
            if (pErr) throw pErr;
            if (existing) pid = existing.id;
        }

        if (!pid) {
            const canonicalPhone = await resolveCanonicalPhone(supabase, phone);
            if (!canonicalPhone) {
                return NextResponse.json({ success: false, message: 'Could not resolve account phone' }, { status: 400 });
            }
            const dossierId = await resolveDossier(supabase, canonicalPhone);
            if (!dossierId) {
                return NextResponse.json({ success: false, message: 'Could not create dossier' }, { status: 500 });
            }
            pid = await resolvePersoon(supabase, dossierId, persoonPhone, persoonName);
            if (!pid) {
                pid = await lazyCreatePersoon(supabase, dossierId, { role, naam, telefoon: persoonPhone, werkstatus, email });
            }
        }

        // 2. For single-file types (replace=true), delete existing rows of
        //    this type before inserting — mirrors Storage's upsert semantics.
        if (replace) {
            await supabase.from('documenten').delete().eq('persoon_id', pid).eq('type', docType);
        }

        // 3. Insert documenten row(s). status='ontvangen' so the sync trigger
        //    counts them as received and flips accounts.documentation_status.
        const canonicalPhone = await resolveCanonicalPhone(supabase, phone);
        const rows = files
            .filter((f) => f && (f.filePath || f.file_path))
            .map((f) => ({
                persoon_id: pid,
                type: docType,
                bestandspad: f.filePath || f.file_path,
                bestandsnaam: f.fileName || f.file_name || null,
                status: 'ontvangen',
                phone_number: canonicalPhone,
            }));

        if (rows.length === 0) {
            return NextResponse.json({ success: false, message: 'No valid file paths provided' }, { status: 400 });
        }

        const { error: insertErr } = await supabase.from('documenten').insert(rows);
        if (insertErr) throw insertErr;

        return NextResponse.json({ success: true, persoonId: pid, count: rows.length });
    } catch (err) {
        console.error('[dossier/save-doc POST]', err);
        return NextResponse.json({ success: false, message: err.message || 'Failed to save document' }, { status: 500 });
    }
}

// DELETE — remove document row(s) after the user removes a file from the form.
// If filePath is provided, only that row is deleted. Otherwise all rows for
// this persoon + docType are deleted (mirrors the form's "remove entire slot"
// behavior).
export async function DELETE(request) {
    try {
        const body = await request.json();
        const { phone, persoonId, persoonPhone, persoonName, docType, filePath } = body || {};

        if (!phone) {
            return NextResponse.json({ success: false, message: 'phone is required' }, { status: 400 });
        }
        if (!docType) {
            return NextResponse.json({ success: false, message: 'docType is required' }, { status: 400 });
        }

        const supabase = admin();

        let pid = null;
        if (persoonId) {
            const { data: existing } = await supabase
                .from('personen').select('id').eq('id', persoonId).maybeSingle();
            if (existing) pid = existing.id;
        }

        if (!pid) {
            const canonicalPhone = await resolveCanonicalPhone(supabase, phone);
            if (!canonicalPhone) {
                return NextResponse.json({ success: false, message: 'Could not resolve account phone' }, { status: 400 });
            }
            const dossierId = await resolveDossier(supabase, canonicalPhone);
            if (!dossierId) {
                return NextResponse.json({ success: true, message: 'No dossier — nothing to delete' });
            }
            pid = await resolvePersoon(supabase, dossierId, persoonPhone, persoonName);
        }

        if (!pid) {
            return NextResponse.json({ success: true, message: 'No persoon found — nothing to delete' });
        }

        let query = supabase.from('documenten').delete().eq('persoon_id', pid).eq('type', docType);
        if (filePath) {
            query = query.eq('bestandspad', filePath);
        }
        const { error: delErr } = await query;
        if (delErr) throw delErr;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[dossier/save-doc DELETE]', err);
        return NextResponse.json({ success: false, message: err.message || 'Failed to delete document' }, { status: 500 });
    }
}