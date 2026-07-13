// Reads application (aanvraag) data from the source of truth:
// dossiers -> personen -> documenten.
//
// The accounts.documents / accounts.co_tenants JSONB columns are mirrors, and
// only one of them is maintained. The trigger from migration 20260224000000
// (sync_accounts_from_dossier_data) keeps `documents`, `documentation_status`
// and the tenant fields in sync — but it never touches `co_tenants`. That
// column is written only by a best-effort, unchecked browser update in
// Aanvraag.jsx, so it stays empty while `personen` holds the real co-tenant
// rows. Read the chain; fall back to the mirrors so legacy rows still show.

export const MAIN_ROLE = 'Hoofdhuurder';

// The statuses the sync trigger treats as "uploaded".
const UPLOADED = new Set(['ontvangen', 'pending']);

const ROLE_LABEL = { Medehuurder: 'Co-tenant', Garantsteller: 'Guarantor', Hoofdhuurder: 'Main tenant' };

const CHUNK = 200;

// dossiers.phone_number and accounts.whatsapp_number are stored in whichever
// format each write path used ('+31 6 …', '+316…', '316…'), so match on digits.
export function phoneKey(phone) {
    return String(phone || '').replace(/\D/g, '');
}

export function phoneCandidates(phone) {
    const raw = String(phone || '');
    const digits = phoneKey(raw);
    if (!digits) return [];
    return [...new Set([raw, `+${digits}`, digits, raw.replace(/\s+/g, '')])].filter(Boolean);
}

export function isMainTenant(p) {
    if (p.rol) return p.rol === MAIN_ROLE;
    return (p.type || 'tenant') === 'tenant';
}

export function roleLabel(p) {
    if (p.rol) return ROLE_LABEL[p.rol] || p.rol;
    if (p.type === 'guarantor') return 'Guarantor';
    if (p.type === 'co_tenant') return 'Co-tenant';
    return 'Co-tenant';
}

export function personName(p) {
    return [p.voornaam, p.achternaam].filter(Boolean).join(' ').trim() || p.naam || '';
}

export function isUploaded(status) {
    return UPLOADED.has(String(status || ''));
}

// Storage paths were historically stored with the bucket name prefixed.
export function storagePath(path) {
    const p = String(path || '');
    return p.startsWith('dossier-documents/') ? p.slice('dossier-documents/'.length) : p;
}

// PostgREST caps URL length, so `.in()` over hundreds of ids has to be chunked.
export async function fetchIn(supabase, table, columns, column, values) {
    const out = [];
    const unique = [...new Set(values)].filter(Boolean);
    for (let i = 0; i < unique.length; i += CHUNK) {
        const { data, error } = await supabase
            .from(table).select(columns).in(column, unique.slice(i, i + CHUNK));
        if (error) throw error;
        out.push(...(data || []));
    }
    return out;
}
