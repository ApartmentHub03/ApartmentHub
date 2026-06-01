// Client-side draft of an in-progress rental application, persisted in
// localStorage and keyed by the applicant's phone number.
//
// Why this exists: the form's personen + typed fields live in React state only,
// and on reload `loadAanvraagDataFromSalesforce` rebuilds the personen list from
// Salesforce *document rows only*. So anyone without an uploaded document yet —
// typically a freshly-added guarantor — disappears on refresh, and the
// tenant<->guarantor link is lost. This draft is the immediate durability layer:
// Salesforce stays canonical for everything it returns; the draft only ADDS back
// what SF doesn't (missing people, empty fields, the link) so nothing the user
// entered silently vanishes.

const KEY_PREFIX = 'aanvraag_draft_v1:';
const digits = (s) => String(s || '').replace(/\D/g, '');
const keyFor = (phone) => `${KEY_PREFIX}${digits(phone)}`;
const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

export function saveAanvraagDraft(phone, draft) {
    if (!isBrowser() || !digits(phone)) return;
    try {
        const payload = {
            personen: draft?.personen || [],
            startDate: draft?.startDate || '',
            motivation: draft?.motivation || '',
            monthsAdvance: draft?.monthsAdvance || 0,
            bidAmounts: draft?.bidAmounts || {},
            savedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(keyFor(phone), JSON.stringify(payload));
    } catch (e) {
        // Quota / serialization failure — non-fatal, the form still works.
        console.warn('[aanvraagDraft] Could not save draft:', e?.message || e);
    }
}

export function loadAanvraagDraft(phone) {
    if (!isBrowser() || !digits(phone)) return null;
    try {
        const raw = window.localStorage.getItem(keyFor(phone));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
        console.warn('[aanvraagDraft] Could not read draft:', e?.message || e);
        return null;
    }
}

export function clearAanvraagDraft(phone) {
    if (!isBrowser() || !digits(phone)) return;
    try {
        window.localStorage.removeItem(keyFor(phone));
    } catch {
        /* ignore */
    }
}

// Stable identity for a person across the SF-derived list and the local draft.
// personIds are not stable (SF assigns p1..pN by order; the draft keeps its
// own), so match on role + phone, falling back to name when phone is absent
// (guarantors often have neither a phone nor a name yet).
const personKey = (p) => {
    const rol = p?.rol || 'Hoofdhuurder';
    const phone = digits(p?.telefoon);
    const name = String(p?.naam || '').trim().toLowerCase();
    return `${rol}|${phone || name}`;
};

// Union a person's documenten by type: keep the Salesforce entry when present
// (authoritative) and add any draft-only types (e.g. an upload SF hasn't
// indexed yet).
function mergeDocumenten(sfDocs, draftDocs) {
    const byType = new Map();
    for (const d of sfDocs || []) if (d?.type) byType.set(d.type, d);
    for (const d of draftDocs || []) if (d?.type && !byType.has(d.type)) byType.set(d.type, d);
    return [...byType.values()];
}

const isEmpty = (v) => v == null || v === '';

/**
 * Merge the Salesforce-derived personen list with the locally saved draft.
 * SF wins for any field it provides; the draft fills empty fields, restores
 * the tenant<->guarantor link, and re-adds whole people SF didn't return
 * (the guarantor-with-no-documents case).
 */
export function mergePersonenWithDraft(sfPersonen, draftPersonen) {
    if (!Array.isArray(draftPersonen) || draftPersonen.length === 0) {
        return sfPersonen;
    }
    const result = (sfPersonen || []).map((p) => ({ ...p }));
    const indexByKey = new Map();
    result.forEach((p, i) => indexByKey.set(personKey(p), i));

    for (const dp of draftPersonen) {
        const k = personKey(dp);
        if (indexByKey.has(k)) {
            const i = indexByKey.get(k);
            const sp = result[i];
            result[i] = {
                ...sp,
                naam: isEmpty(sp.naam) ? (dp.naam || '') : sp.naam,
                email: isEmpty(sp.email) ? (dp.email || '') : sp.email,
                werkstatus: isEmpty(sp.werkstatus) ? (dp.werkstatus || '') : sp.werkstatus,
                inkomen: isEmpty(sp.inkomen) ? (dp.inkomen ?? '') : sp.inkomen,
                adres: isEmpty(sp.adres) ? (dp.adres || '') : sp.adres,
                postcode: isEmpty(sp.postcode) ? (dp.postcode || '') : sp.postcode,
                woonplaats: isEmpty(sp.woonplaats) ? (dp.woonplaats || '') : sp.woonplaats,
                linkedToPersoonId: sp.linkedToPersoonId ?? dp.linkedToPersoonId,
                accountId: sp.accountId ?? dp.accountId,
                documenten: mergeDocumenten(sp.documenten, dp.documenten),
            };
        } else {
            // SF didn't return this person (e.g. a guarantor added but with no
            // documents yet). Re-add them from the draft so they don't vanish.
            result.push({ ...dp });
        }
    }
    return result;
}
