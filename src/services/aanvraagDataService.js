import { supabase } from '../integrations/supabase/client';
import { documentsByWorkStatus } from '../config/documentRequirements';

const ROLE_BY_SF_ROLE = {
    main_tenant: 'Hoofdhuurder',
    co_tenant: 'Medehuurder',
    guarantor: 'Garantsteller',
};

// Salesforce returns file paths with the bucket prefix (`dossier-documents/...`)
// because the edge function prepends it. The rest of the app stores/uses
// raw paths without the prefix, so strip it on read.
function stripBucketPrefix(p) {
    if (!p) return p;
    return p.startsWith('dossier-documents/') ? p.slice('dossier-documents/'.length) : p;
}

function groupDocumentsForPerson(docs) {
    const byType = {};
    for (const d of docs) {
        if (!byType[d.type]) byType[d.type] = [];
        byType[d.type].push({
            id: d.id,
            type: d.type,
            name: d.file_name,
            fileName: d.file_name,
            filePath: stripBucketPrefix(d.file_path),
            status: d.status === 'pending' ? 'ontvangen' : (d.status || 'ontvangen'),
        });
    }
    const multiFileTypes = Object.values(documentsByWorkStatus)
        .flat()
        .filter(doc => doc.multiFile === true)
        .map(doc => doc.type);

    return Object.entries(byType).map(([type, files]) => {
        if (multiFileTypes.includes(type) || files.length > 1) {
            return { type, files, status: 'ontvangen' };
        }
        return { type, file: files[0], status: files[0]?.status || 'ontvangen' };
    });
}

/**
 * Load Aanvraag form data from Salesforce (apexrest/apthub/dossier).
 * Lookup id is the phone number (digits only — `+` is stripped).
 *
 * Salesforce is the only source. There is no Supabase fallback: when SF is
 * reachable but has no record, we hand back an empty form; only a real
 * network/route 5xx returns ok:false.
 */
const buildEmptyAanvraagForm = (phoneNumber) => ({
    bidAmount: 0,
    startDate: '',
    motivation: '',
    monthsAdvance: 0,
    propertyAddress: '',
    personen: [
        {
            persoonId: 'p1',
            naam: '',
            email: '',
            telefoon: phoneNumber || '',
            rol: 'Hoofdhuurder',
            werkstatus: '',
            inkomen: '',
            adres: '',
            postcode: '',
            woonplaats: '',
            linkedToPersoonId: null,
            documenten: [],
            docsCompleet: false,
        },
    ],
});

export const loadAanvraagDataFromSalesforce = async (phoneNumber) => {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    if (!digits) return { ok: false, error: 'Missing phone number' };

    let res;
    let payload;
    try {
        res = await fetch(`/api/salesforce/dossier?phone=${encodeURIComponent(digits)}`);
        payload = await res.json();
    } catch (error) {
        console.error('Error in loadAanvraagDataFromSalesforce (unreachable):', error);
        return { ok: false, error: error.message || 'Failed to load from Salesforce' };
    }

    try {
        // Distinguish "SF reached, no record for this phone" from "SF / route
        // unreachable". The /api/salesforce/dossier route returns 502 with
        // `details.success === false` when SF itself responds "no dossier" —
        // we treat that as a reachable-empty response so the form renders
        // blank. Genuine HTTP/network errors still return `ok: false`.
        const sfRespondedEmpty =
            payload?.details?.success === false ||
            (res.ok && payload?.success !== false && !payload?.dossier) ||
            (res.ok && payload?.dossier?.success === false);

        if (!res.ok && !sfRespondedEmpty) {
            return { ok: false, error: payload?.error || `Salesforce ${res.status}` };
        }
        if (payload?.success === false && !sfRespondedEmpty) {
            return { ok: false, error: payload?.error || 'Salesforce error' };
        }

        const sf = payload?.dossier;
        if (sfRespondedEmpty || !sf || sf.success === false) {
            return {
                ok: true,
                data: buildEmptyAanvraagForm(phoneNumber),
                source: 'salesforce',
                empty: true,
            };
        }

        // Group documents by person. Salesforce sends one document row per file,
        // each with an inline `person`. Dedup by role + phone (guarantors often
        // have a null phone and empty name, so we still treat them as one
        // person per role in that case).
        const personBuckets = new Map();
        const orderedKeys = [];
        for (const d of sf.documents || []) {
            const p = d.person || {};
            const role = p.role || 'main_tenant';
            const phoneKey = (p.phone_number || '').replace(/\D/g, '');
            const key = `${role}|${phoneKey || (p.name || '')}`;
            if (!personBuckets.has(key)) {
                personBuckets.set(key, { person: p, docs: [] });
                orderedKeys.push(key);
            }
            personBuckets.get(key).docs.push(d);
        }

        // Always ensure a main tenant bucket exists, even if SF returned no
        // documents at all (fresh dossier with form values only).
        const mainKey = `main_tenant|${(sf.phone_number || '').replace(/\D/g, '')}`;
        if (!personBuckets.has(mainKey)) {
            personBuckets.set(mainKey, {
                person: {
                    role: 'main_tenant',
                    name: sf.tenant_name || '',
                    phone_number: sf.phone_number || '',
                    email: sf.email || '',
                },
                docs: [],
            });
            orderedKeys.unshift(mainKey);
        }

        const personen = orderedKeys.map((key, idx) => {
            const { person, docs } = personBuckets.get(key);
            const role = person.role || 'main_tenant';
            const rolNL = ROLE_BY_SF_ROLE[role] || 'Hoofdhuurder';
            const isMain = role === 'main_tenant';
            const inkomenRaw = person.inkomen;
            const inkomen = inkomenRaw == null || inkomenRaw === '' ? '' : String(inkomenRaw);
            return {
                persoonId: `p${idx + 1}`,
                naam: isMain ? (person.name || sf.tenant_name || '') : (person.name || ''),
                email: (person.email || (isMain ? sf.email : '') || ''),
                telefoon: person.phone_number || (isMain ? sf.phone_number : '') || '',
                rol: rolNL,
                werkstatus: person.werkstatus || '',
                inkomen,
                adres: person.adres || '',
                postcode: person.postcode || '',
                woonplaats: person.woonplaats || '',
                linkedToPersoonId: null,
                documenten: groupDocumentsForPerson(docs),
                docsCompleet: docs.length > 0,
            };
        });

        return {
            ok: true,
            data: {
                bidAmount: sf.bid_amount || 0,
                startDate: sf.start_date || '',
                motivation: sf.motivation || '',
                monthsAdvance: sf.months_advance || 0,
                propertyAddress: sf.property_address || '',
                personen,
            },
            source: 'salesforce',
        };
    } catch (error) {
        console.error('Error in loadAanvraagDataFromSalesforce:', error);
        return { ok: false, error: error.message || 'Failed to load from Salesforce' };
    }
};

const ROLE_BY_PERSON_TYPE = {
    co_tenant: 'Medehuurder',
    guarantor: 'Garantsteller',
};

// Group documenten-table rows (bestandsnaam / bestandspad / status) into the
// form's documenten shape — single-file slots nest under `file`, multi-file
// slots (e.g. payslips) carry a `files` array.
function groupDocumentenRows(rows) {
    const byType = {};
    for (const d of rows || []) {
        if (!byType[d.type]) byType[d.type] = [];
        byType[d.type].push({
            id: d.id,
            type: d.type,
            name: d.bestandsnaam,
            fileName: d.bestandsnaam,
            filePath: d.bestandspad,
            status: d.status === 'pending' ? 'ontvangen' : (d.status || 'ontvangen'),
        });
    }
    const multiFileTypes = Object.values(documentsByWorkStatus)
        .flat()
        .filter(doc => doc.multiFile === true)
        .map(doc => doc.type);

    return Object.entries(byType).map(([type, files]) => {
        if (multiFileTypes.includes(type) || files.length > 1) {
            return { type, files, status: 'ontvangen' };
        }
        return { type, file: files[0], status: files[0]?.status || 'ontvangen' };
    });
}

/**
 * Load invited co-tenants / guarantors (and their uploaded documents) for a
 * dossier straight from Supabase. The invite form writes the invitee's details
 * to `personen` and their files to `documenten`, but the main tenant's form
 * rebuilds its personen list from Salesforce — which never sees this data. The
 * main tenant load merges the result of this in so an invitee's self-entered
 * details + documents show up alongside the name/phone the main tenant added.
 *
 * @param {string} dossierId
 * @returns {Promise<Array>} person objects in the form's personen shape
 */
export const loadLinkedPersonenFromSupabase = async (dossierId) => {
    if (!supabase || !dossierId) return [];
    try {
        const { data: people, error } = await supabase
            .from('personen')
            .select('id, voornaam, achternaam, email, telefoon, rol, type, werk_status, bruto_maandinkomen, huidige_adres, postcode, woonplaats, linked_to_persoon_id')
            .eq('dossier_id', dossierId)
            .in('type', ['co_tenant', 'guarantor']);
        if (error || !people?.length) return [];

        const ids = people.map(p => p.id);
        const { data: docs } = await supabase
            .from('documenten')
            .select('id, persoon_id, type, bestandsnaam, bestandspad, status')
            .in('persoon_id', ids);

        const docsByPerson = {};
        for (const d of docs || []) {
            (docsByPerson[d.persoon_id] = docsByPerson[d.persoon_id] || []).push(d);
        }

        return people.map(p => {
            const naam = `${p.voornaam || ''} ${p.achternaam || ''}`.trim();
            const inkomenRaw = p.bruto_maandinkomen;
            return {
                // Stable id derived from the personen row, used only if this
                // person is appended (i.e. the main tenant didn't already have
                // them locally). Matched people keep their existing persoonId.
                persoonId: `sb_${p.id}`,
                naam,
                email: p.email || '',
                telefoon: p.telefoon || '',
                rol: ROLE_BY_PERSON_TYPE[p.type] || p.rol || 'Garantsteller',
                werkstatus: p.werk_status || '',
                inkomen: inkomenRaw == null || inkomenRaw === '' ? '' : String(inkomenRaw),
                adres: p.huidige_adres || '',
                postcode: p.postcode || '',
                woonplaats: p.woonplaats || '',
                documenten: groupDocumentenRows(docsByPerson[p.id]),
                docsCompleet: (docsByPerson[p.id]?.length || 0) > 0,
            };
        });
    } catch (e) {
        console.warn('[aanvraagDataService] loadLinkedPersonenFromSupabase failed:', e?.message || e);
        return [];
    }
};

/**
 * Collect every storage path attached to a person across both single-file
 * and multi-file documenten entries. Used by the remove flows below to
 * clean the bucket without consulting any database.
 */
const collectPersonFilePaths = (persoon) => {
    const paths = [];
    for (const d of persoon?.documenten || []) {
        if (d?.file?.filePath) paths.push(d.file.filePath);
        if (d?.filePath) paths.push(d.filePath);
        if (Array.isArray(d?.files)) {
            for (const f of d.files) {
                if (f?.filePath) paths.push(f.filePath);
            }
        }
    }
    return paths.filter(Boolean);
};

/**
 * Remove a person from the dossier. Salesforce holds the canonical personen
 * list (and learns about the removal on the next submit), so this only
 * cleans Supabase-side artifacts: their files in the bucket and their entry
 * in the main tenant's `accounts.co_tenants` JSONB.
 *
 * @param {Object} persoon - The person object from the form's React state
 * @param {string|null} accountId - Main tenant's account ID (for co_tenants JSONB cleanup)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const deletePersonFromSupabase = async (persoon, accountId) => {
    try {
        if (!supabase) {
            console.log('[Mock] deletePersonFromSupabase:', persoon?.persoonId);
            return { ok: true };
        }

        const filePaths = collectPersonFilePaths(persoon);
        if (filePaths.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('dossier-documents')
                .remove(filePaths);
            if (storageError) {
                console.warn('[aanvraagDataService] Storage cleanup error:', storageError.message);
            }
        }

        const linkedAccountId = persoon?.accountId || null;

        if (accountId && linkedAccountId) {
            const { data: mainAcc } = await supabase
                .from('accounts')
                .select('co_tenants')
                .eq('id', accountId)
                .single();

            if (mainAcc?.co_tenants) {
                const updatedCoTenants = mainAcc.co_tenants.filter(
                    ct => ct.account_id !== linkedAccountId
                );
                await supabase
                    .from('accounts')
                    .update({ co_tenants: updatedCoTenants })
                    .eq('id', accountId);
            }
        }

        if (linkedAccountId) {
            await supabase
                .from('accounts')
                .update({
                    linked_account_id: null,
                    account_role: null
                })
                .eq('id', linkedAccountId);
        }

        console.log('[aanvraagDataService] ✓ Cleaned storage + account links for:', persoon?.persoonId);
        return { ok: true };
    } catch (error) {
        console.error('Error in deletePersonFromSupabase:', error);
        return { ok: false, error: 'Failed to delete person' };
    }
};
