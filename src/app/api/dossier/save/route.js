import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase write path for the /aanvraag dossier — the target of the Salesforce
// removal. Resolves the accounts row, then upserts dossiers -> personen ->
// documenten from the form's data. Writing the documenten rows fires the live
// DB trigger that recomputes accounts.documentation_status -> 'Complete', which
// in turn fires the n8n `document-status-completed` WhatsApp. This REPLACES the
// form's old direct documentation_status write + forward-docs-to-salesforce.
//
// CRITICAL: the recompute trigger matches accounts.whatsapp_number =
// dossiers.phone_number EXACTLY, so we resolve the account first and write the
// dossier/documenten phone in the account's own format — never a guessed one.
//
// Service-role (server-side) to avoid RLS friction; the route is for the public
// application form, matched by phone number like the other aanvraag writes.

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

export async function POST(request) {
    try {
        const body = await request.json();
        const { phone, dossier = {}, personen = [] } = body || {};
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits) {
            return NextResponse.json({ success: false, message: 'phone is required' }, { status: 400 });
        }
        const supabase = admin();
        const candidates = [...new Set([phone, `+${digits}`, digits, String(phone).replace(/\s+/g, '')])].filter(Boolean);

        // 0. Resolve (or lazy-create) the accounts row. We adopt its exact
        // whatsapp_number as the canonical phone so the documentation_status
        // recompute trigger reliably matches. Lazy-create mirrors the safety
        // net that forward-docs-to-salesforce used to provide.
        const mainPerson = personen.find((p) => p.rol === 'Hoofdhuurder') || personen[0] || {};
        const tenantName =
            dossier.tenantName ||
            mainPerson.naam ||
            [mainPerson.voornaam, mainPerson.achternaam].filter(Boolean).join(' ') ||
            null;

        const { data: accMatch } = await supabase
            .from('accounts').select('id, whatsapp_number')
            .in('whatsapp_number', candidates).limit(1);

        let canonicalPhone;
        let accountId = accMatch?.[0]?.id || null;
        if (accountId) {
            canonicalPhone = accMatch[0].whatsapp_number;
        } else {
            canonicalPhone = `+${digits}`;
            const { data: createdAcc, error: accErr } = await supabase
                .from('accounts')
                .insert({ whatsapp_number: canonicalPhone, tenant_name: tenantName, account_role: 'tenant' })
                .select('id').single();
            if (accErr) throw new Error('account provision: ' + accErr.message);
            accountId = createdAcc.id;
        }

        // 1. Find or create the dossier, keyed on the canonical phone.
        const { data: existing } = await supabase
            .from('dossiers').select('id').eq('phone_number', canonicalPhone)
            .order('created_at', { ascending: false }).limit(1);

        const dossierFields = {
            phone_number: canonicalPhone,
            email: dossier.email || null,
            bid_amount: dossier.bidAmount != null && dossier.bidAmount !== '' ? Number(dossier.bidAmount) : null,
            start_date: dossier.startDate || null,
            motivation: dossier.motivation || null,
            months_advance: dossier.monthsAdvance != null && dossier.monthsAdvance !== '' ? Number(dossier.monthsAdvance) : null,
            property_address: dossier.propertyAddress || null,
        };

        let dossierId;
        if (existing?.[0]) {
            dossierId = existing[0].id;
            const { error } = await supabase.from('dossiers').update(dossierFields).eq('id', dossierId);
            if (error) throw error;
        } else {
            // 'submitted' is the only non-draft status used downstream; new
            // dossier INSERT here also fires the reminder schedulers (rare —
            // most submitters already have a 'draft' dossier from login).
            const { data: created, error } = await supabase
                .from('dossiers').insert({ ...dossierFields, status: 'submitted' }).select('id').single();
            if (error) throw error;
            dossierId = created.id;
        }

        // 2. Replace personen (+ their documenten) for a clean, idempotent save.
        const { data: oldPersonen } = await supabase.from('personen').select('id').eq('dossier_id', dossierId);
        const oldIds = (oldPersonen || []).map((p) => p.id);
        if (oldIds.length) {
            await supabase.from('documenten').delete().in('persoon_id', oldIds);
            await supabase.from('personen').delete().eq('dossier_id', dossierId);
        }

        const savedPersonen = [];
        for (const p of personen) {
            const { voornaam, achternaam } = p.voornaam || p.achternaam
                ? { voornaam: p.voornaam || '', achternaam: p.achternaam || '' }
                : splitName(p.naam);
            const type = p.type || TYPE_BY_ROLE[p.rol] || 'tenant';
            const row = {
                dossier_id: dossierId,
                type,
                rol: p.rol || null,
                voornaam, achternaam,
                email: p.email || null,
                telefoon: p.telefoon || null,
                werk_status: p.werkstatus || p.werk_status || null,
                bruto_maandinkomen: p.inkomen != null && p.inkomen !== '' ? Number(p.inkomen) : null,
                huidige_adres: p.adres || null,
                postcode: p.postcode || null,
                woonplaats: p.woonplaats || null,
                startdatum: p.startdatum || null,
            };
            const { data: person, error: pErr } = await supabase.from('personen').insert(row).select('id').single();
            if (pErr) throw pErr;

            // Flatten the form's grouped documenten ({type, file|files}) into
            // rows. Only uploaded files are written, as status 'ontvangen' —
            // that's what drives the recompute to 'Complete'.
            const docRows = [];
            for (const d of p.documenten || []) {
                const files = d.files || (d.file ? [d.file] : []);
                for (const f of files) {
                    if (!f || !(f.filePath || f.file_path)) continue;
                    docRows.push({
                        persoon_id: person.id,
                        type: d.type,
                        bestandsnaam: f.fileName || f.name || null,
                        bestandspad: f.filePath || f.file_path || null,
                        status: 'ontvangen',
                        phone_number: canonicalPhone,
                    });
                }
            }
            if (docRows.length) {
                const { error: dErr } = await supabase.from('documenten').insert(docRows);
                if (dErr) throw dErr;
            }
            savedPersonen.push({ id: person.id, type, docs: docRows.length });
        }

        // Report back the resulting documentation_status so the caller (and our
        // tests) can confirm the trigger chain fired.
        const { data: accAfter } = await supabase
            .from('accounts').select('documentation_status').eq('id', accountId).single();

        return NextResponse.json({
            success: true,
            dossierId,
            accountId,
            documentation_status: accAfter?.documentation_status ?? null,
            personen: savedPersonen,
        });
    } catch (err) {
        console.error('[dossier/save POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
