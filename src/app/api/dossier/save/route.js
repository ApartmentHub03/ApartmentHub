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
        const { phone, dossier = {}, personen = [], apartmentSelected = null } = body || {};
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits) {
            return NextResponse.json({ success: false, message: 'phone is required' }, { status: 400 });
        }

        // Validate personen: no duplicate phones, no cross-role phone conflicts.
        // Skip entries with null/empty telefoon (e.g. guarantors without a phone).
        const phoneRoleMap = new Map();
        for (const p of personen) {
            const pDigits = String(p.telefoon || '').replace(/\D/g, '');
            if (!pDigits) continue;
            const existing = phoneRoleMap.get(pDigits);
            if (existing) {
                if (existing.rol !== (p.rol || null)) {
                    const roleLabels = { Hoofdhuurder: 'main tenant', Medehuurder: 'co-tenant', Garantsteller: 'guarantor' };
                    const r1 = roleLabels[existing.rol] || existing.rol || 'unknown';
                    const r2 = roleLabels[p.rol] || p.rol || 'unknown';
                    return NextResponse.json({
                        success: false,
                        message: `Phone number ${p.telefoon} is used as both ${r1} and ${r2}. Each person can only have one role per application.`
                    }, { status: 400 });
                }
                return NextResponse.json({
                    success: false,
                    message: `Phone number ${p.telefoon} is duplicated. Remove the duplicate person.`
                }, { status: 400 });
            }
            phoneRoleMap.set(pDigits, { rol: p.rol || null });
        }
        const supabase = admin();
        const candidates = [...new Set([phone, `+${digits}`, digits, String(phone).replace(/\s+/g, '')])].filter(Boolean);

        // 0. Resolve (or lazy-create) the accounts row. We adopt its exact
        // whatsapp_number as the canonical phone so the documentation_status
        // recompute trigger reliably matches. Lazy-create mirrors the safety
        // net that forward-docs-to-salesforce used to provide.
        //
        // Email is written to the account here too (from dossier.email) so
        // that downstream flows — especially /api/admin/crm/invoices/[id]/send
        // which requires accounts.email — can actually send the invoice email.
        // Without this, a tenant who filled in their email on the form but
        // never received an email-based OTP would have accounts.email = NULL
        // forever, and Send invoice would 400 with "Account has no email
        // address".
        const mainPerson = personen.find((p) => p.rol === 'Hoofdhuurder') || personen[0] || {};
        const tenantName =
            dossier.tenantName ||
            mainPerson.naam ||
            [mainPerson.voornaam, mainPerson.achternaam].filter(Boolean).join(' ') ||
            null;

        const { data: accMatch } = await supabase
            .from('accounts').select('id, whatsapp_number, email').in('whatsapp_number', candidates).limit(1);

        let canonicalPhone;
        let accountId = accMatch?.[0]?.id || null;
        if (accountId) {
            canonicalPhone = accMatch[0].whatsapp_number;
            // Backfill email on the existing account if the form carries one
            // and the account's email is null. Idempotent — won't overwrite a
            // real email already on the row.
            if (dossier.email && !accMatch[0].email) {
                const { error: emailUpErr } = await supabase
                    .from('accounts')
                    .update({ email: dossier.email })
                    .eq('id', accountId);
                if (emailUpErr) {
                    console.warn('[dossier/save] could not backfill accounts.email:', emailUpErr.message);
                }
            }
        } else {
            canonicalPhone = `+${digits}`;
            const { data: createdAcc, error: accErr } = await supabase
                .from('accounts')
                .insert({
                    whatsapp_number: canonicalPhone,
                    tenant_name: tenantName,
                    email: dossier.email || null,
                    account_role: 'tenant',
                })
                .select('id').single();
            if (accErr) throw new Error('account provision: ' + accErr.message);
            accountId = createdAcc.id;
        }

        // 0b. Flush the stashed apartment selection (from /appartementen on a
        // fresh user with no account yet) onto the account row now that it
        // exists. The client stashes to localStorage 'pending_apartment_selected'
        // when /api/dossier/select-apartment returns no_account, and forwards
        // the stash here as `apartmentSelected`. Normalized to the same shape
        // select-apartment POST uses.
        if (Array.isArray(apartmentSelected) && apartmentSelected.length > 0) {
            const normalizedApts = apartmentSelected
                .filter(a => a && a.apartment_id)
                .map(a => ({
                    apartment_id: a.apartment_id,
                    address: a.address || '',
                    rental_price: a.rental_price ?? null,
                    selected_at: a.selected_at || new Date().toISOString(),
                }));
            if (normalizedApts.length > 0) {
                const { error: aptSelErr } = await supabase
                    .from('accounts')
                    .update({ apartment_selected: normalizedApts })
                    .eq('id', accountId);
                if (aptSelErr) {
                    console.warn('[dossier/save] could not flush pending apartment_selected:', aptSelErr.message);
                }
            }
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

        // 2. Replace personen, preserving existing documenten across the swap.
        //
        // The old approach was: delete ALL documenten + personen, then re-insert
        // from the form's React state. If the form state was stale (e.g. page
        // reloaded and draft merge dropped some docs), the documenten rows
        // created by /api/dossier/save-doc (incremental upload) were permanently
        // lost — the CRM then showed everything as "Missing."
        //
        // New approach: cache existing documenten before deleting personen,
        // match them to the new personen by (rol + name), and re-insert with
        // the new persoon_ids. Form-payload documenten are then upserted,
        // deduped by bestandspad so we never create duplicates.
        const { data: oldPersonen } = await supabase
            .from('personen').select('id, rol, voornaam, achternaam, naam, type, telefoon')
            .eq('dossier_id', dossierId);
        const oldIds = (oldPersonen || []).map((p) => p.id);

        // 2a. Cache existing documenten keyed by old persoon_id.
        let cachedDocs = [];
        if (oldIds.length) {
            const { data: existingDocs } = await supabase
                .from('documenten').select('*').in('persoon_id', oldIds);
            cachedDocs = existingDocs || [];
        }

        // 2b. Delete old documenten + personen.
        if (oldIds.length) {
            await supabase.from('documenten').delete().in('persoon_id', oldIds);
            await supabase.from('personen').delete().eq('dossier_id', dossierId);
        }

        // 2c. Build a mapping from old persoon identity → new persoon id.
        // Match by (rol + lowercased name) or (rol + telefoon digits).
        const oldPersonKey = (p) => {
            const name = `${p.voornaam || ''} ${p.achternaam || ''}`.trim().toLowerCase() || (p.naam || '').trim().toLowerCase();
            const phone = String(p.telefoon || '').replace(/\D/g, '');
            return `${p.rol || p.type || ''}|${name}|${phone}`;
        };
        const oldKeyToNewId = new Map();

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

            // Record the old→new mapping so cached docs can be re-linked.
            const newName = `${voornaam || ''} ${achternaam || ''}`.trim().toLowerCase();
            const newPhone = String(p.telefoon || '').replace(/\D/g, '');
            const newKey = `${p.rol || type || ''}|${newName}|${newPhone}`;
            oldKeyToNewId.set(newKey, person.id);
            // Also try matching by name only (phone may differ between save-doc and save).
            const nameOnlyKey = `${p.rol || type || ''}|${newName}`;
            if (!oldKeyToNewId.has(nameOnlyKey)) {
                oldKeyToNewId.set(nameOnlyKey, person.id);
            }

            // Flatten the form's grouped documenten ({type, file|files}) into
            // rows. Only uploaded files are written, as status 'ontvangen' —
            // that's what drives the recompute to 'Complete'.
            const docRows = [];
            for (const d of p.documenten || []) {
                let files = d.files;
                if (!files || files.length === 0) {
                    files = d.file ? [d.file] : (d.filePath || d.file_path ? [d] : []);
                }
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

            // Re-link cached documenten from the old persoon to the new one.
            // Dedupe by bestandspad — if the form payload already carries the
            // same file, skip the cached copy.
            const formPaths = new Set(docRows.map((r) => r.bestandspad).filter(Boolean));
            const targetNewId = person.id;

            for (const cd of cachedDocs) {
                // Match cached doc to this new person if the old persoon's key
                // maps to this new id.
                const oldPerson = (oldPersonen || []).find((op) => op.id === cd.persoon_id);
                if (!oldPerson) continue;
                const opFullName = `${oldPerson.voornaam || ''} ${oldPerson.achternaam || ''}`.trim().toLowerCase() || (oldPerson.naam || '').trim().toLowerCase();
                const opKey = oldPersonKey(oldPerson);
                const opNameOnly = `${oldPerson.rol || oldPerson.type || ''}|${opFullName}`;

                // Check if this old person maps to the current new person.
                const mappedNewId = oldKeyToNewId.get(opKey) || oldKeyToNewId.get(opNameOnly);
                if (mappedNewId !== targetNewId) continue;

                // Skip if the form payload already has this file.
                if (cd.bestandspad && formPaths.has(cd.bestandspad)) continue;

                docRows.push({
                    persoon_id: targetNewId,
                    type: cd.type,
                    bestandsnaam: cd.bestandsnaam || null,
                    bestandspad: cd.bestandspad || cd.file_path || null,
                    status: cd.status || 'ontvangen',
                    phone_number: canonicalPhone,
                });
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
