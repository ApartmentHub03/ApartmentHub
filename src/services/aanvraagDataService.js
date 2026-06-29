import { supabase } from '../integrations/supabase/client';
import { documentsByWorkStatus } from '../config/documentRequirements';

// Supabase personen.type -> Dutch role label, and display ordering (tenant first).
const ROLE_BY_TYPE = {
    tenant: 'Hoofdhuurder',
    main_tenant: 'Hoofdhuurder',
    co_tenant: 'Medehuurder',
    guarantor: 'Garantsteller',
};
const TYPE_ORDER = { tenant: 0, main_tenant: 0, co_tenant: 1, guarantor: 2 };

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
 * Load Aanvraag form data from SUPABASE (dossiers -> personen -> documenten).
 * This is the system of record (Salesforce has been removed). Lookup is by
 * phone number, matched with or without a leading `+`. Returns the same shape
 * as the legacy Salesforce loader so the form consumes it unchanged.
 */
export const loadAanvraagDataFromSupabase = async (phoneNumber) => {
    try {
        const digits = String(phoneNumber || '').replace(/\D/g, '');
        if (!digits) return { ok: true, data: buildEmptyAanvraagForm(phoneNumber), source: 'supabase', empty: true };
        const candidates = [...new Set([phoneNumber, `+${digits}`, digits])].filter(Boolean);

        const { data: dossiers, error: dErr } = await supabase
            .from('dossiers')
            .select('*')
            .in('phone_number', candidates)
            .order('created_at', { ascending: false })
            .limit(1);
        if (dErr) return { ok: false, error: dErr.message };

        const dossier = dossiers?.[0];
        if (!dossier) return { ok: true, data: buildEmptyAanvraagForm(phoneNumber), source: 'supabase', empty: true };

        const { data: personen } = await supabase
            .from('personen')
            .select('*')
            .eq('dossier_id', dossier.id);

        const ordered = (personen || []).slice().sort(
            (a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)
        );

        const mapped = await Promise.all(ordered.map(async (p, idx) => {
            const { data: docs } = await supabase
                .from('documenten')
                .select('*')
                .eq('persoon_id', p.id);
            // Adapt Supabase column names to what groupDocumentsForPerson expects.
            const adapted = (docs || []).map((d) => ({
                id: d.id, type: d.type, file_name: d.bestandsnaam, file_path: d.bestandspad, status: d.status,
            }));
            const naam = `${p.voornaam || ''} ${p.achternaam || ''}`.trim();
            return {
                persoonId: `p${idx + 1}`,
                naam,
                email: p.email || '',
                telefoon: p.telefoon || '',
                rol: p.rol || ROLE_BY_TYPE[p.type] || 'Hoofdhuurder',
                werkstatus: p.werk_status || '',
                inkomen: p.bruto_maandinkomen == null || p.bruto_maandinkomen === '' ? '' : String(p.bruto_maandinkomen),
                adres: p.huidige_adres || '',
                postcode: p.postcode || '',
                woonplaats: p.woonplaats || '',
                linkedToPersoonId: null,
                documenten: groupDocumentsForPerson(adapted),
                docsCompleet: (docs || []).length > 0,
            };
        }));

        // Always guarantee a main tenant bucket.
        if (!mapped.some((m) => m.rol === 'Hoofdhuurder')) {
            mapped.unshift({
                persoonId: 'p0', naam: '', email: dossier.email || '', telefoon: dossier.phone_number || phoneNumber || '',
                rol: 'Hoofdhuurder', werkstatus: '', inkomen: '', adres: '', postcode: '', woonplaats: '',
                linkedToPersoonId: null, documenten: [], docsCompleet: false,
            });
        }

        return {
            ok: true,
            source: 'supabase',
            data: {
                bidAmount: dossier.bid_amount || 0,
                startDate: dossier.start_date || '',
                motivation: dossier.motivation || '',
                monthsAdvance: dossier.months_advance || 0,
                propertyAddress: dossier.property_address || '',
                personen: mapped,
            },
        };
    } catch (error) {
        console.error('Error in loadAanvraagDataFromSupabase:', error);
        return { ok: false, error: error.message || 'Failed to load from Supabase' };
    }
};

// Empty form scaffold (one blank main-tenant bucket) returned when no dossier
// exists yet for a phone number.
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
