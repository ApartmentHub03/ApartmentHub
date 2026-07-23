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

import { generateLetterOfIntentPdf } from '@/lib/pdf/letterOfIntent';

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

// --- Application ZIP builder ---
// Extracted from src/app/api/admin/crm/application/[id]/zip/route.js so the
// generate-offer route can attach the same ZIP to the Gmail draft without
// duplicating the fetch + Storage download + JSZip logic. Returns null when
// there are no downloadable files (caller should skip the attachment in that
// case rather than failing the draft).

const ZIP_BUCKET = 'dossier-documents';
const ZIP_INTERNAL_DOC_TYPES = ['loi_signature'];

function safeSegment(s) {
    return String(s || '')
        .replace(/[^A-Za-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'unnamed';
}

function safeFileName(s) {
    const raw = String(s || '');
    const dot = raw.lastIndexOf('.');
    if (dot <= 0) return safeSegment(raw) || 'document';
    const stem = raw.slice(0, dot);
    const ext = raw.slice(dot + 1).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const safeStem = safeSegment(stem) || 'document';
    return ext ? `${safeStem}.${ext}` : safeStem;
}

/**
 * Build a ZIP of all (or one person's) uploaded documents for a tenant
 * application. Mirrors the logic in the zip download route.
 *
 * @param {object} supabase - service-role Supabase client
 * @param {string} accountId - accounts.id
 * @param {object} [opts]
 * @param {string} [opts.personId] - restrict to one person's documents
 * @param {string} [opts.apartmentId] - when provided (and personId is not
 *   set — the LOI is a whole-application document, not per-person), a
 *   pre-filled "letter-of-intent.pdf" is generated and included at the root
 *   of the archive alongside the per-person folders.
 * @returns {Promise<{buffer: ArrayBuffer, filename: string, fileCount: number} | null>}
 *   null when no downloadable files exist.
 */
export async function buildApplicationZip(supabase, accountId, { personId, apartmentId } = {}) {
    const JSZip = (await import('jszip')).default;

    // 1. Load the account.
    const { data: account, error: accErr } = await supabase
        .from('accounts')
        .select('id, tenant_name, whatsapp_number, email, nationality, work_status, monthly_income, current_address, current_zipcode, preferred_location, move_in_date, negotiation_notes, co_tenants, documents, documentation_status, offered_apartments, apartments_applied_for, account_role, status')
        .eq('id', accountId)
        .maybeSingle();
    if (accErr) throw accErr;
    if (!account) return null;

    // 2. Resolve the dossier behind this account by phone.
    const { data: dossierRows } = await supabase
        .from('dossiers')
        .select('id, bid_amount, start_date, motivation, months_advance')
        .in('phone_number', phoneCandidates(account.whatsapp_number))
        .order('created_at', { ascending: false })
        .limit(1);
    const dossier = dossierRows?.[0] || null;
    const dossierId = dossier?.id || null;

    // 3. People + their documents.
    const personen = dossierId
        ? await fetchIn(supabase, 'personen', '*', 'dossier_id', [dossierId])
        : [];
    const documenten = personen.length
        ? await fetchIn(supabase, 'documenten', '*', 'persoon_id', personen.map((p) => p.id))
        : [];

    const personById = new Map(personen.map((p) => [p.id, p]));

    // 4. Normalise to one doc shape.
    const rawDocs = documenten.length
        ? documenten.map((d) => {
            const p = personById.get(d.persoon_id);
            return {
                type: d.type,
                status: d.status,
                file_name: d.bestandsnaam,
                file_path: d.bestandspad || d.file_path,
                uploaded_at: d.uploaded_at,
                person_id: d.persoon_id,
                person: p ? personName(p) : null,
                person_role: p ? roleLabel(p) : null,
            };
        })
        : (Array.isArray(account.documents) ? account.documents : []).map((d) => ({
            ...d,
            person_id: null,
            person: account.tenant_name || null,
            person_role: 'Main tenant',
        }));

    // 5. Drop internal-only docs, apply optional personId filter.
    let filtered = rawDocs.filter((d) => !ZIP_INTERNAL_DOC_TYPES.includes(d.type));
    let personFilterName = null;
    if (personId) {
        filtered = filtered.filter((d) => {
            if (d.person_id) return d.person_id === personId;
            const p = personen.find((pp) => pp.id === personId);
            const pn = p ? personName(p) : null;
            return pn && d.person === pn;
        });
        const p = personen.find((pp) => pp.id === personId);
        personFilterName = p ? personName(p) : filtered[0]?.person || null;
    }

    // 6. Build the zip.
    const zip = new JSZip();
    const fileList = [];
    const usedPaths = new Set();

    for (const d of filtered) {
        const entry = {
            person: d.person,
            person_role: d.person_role,
            type: d.type,
            status: d.status,
            ok: false,
            path: null,
            size: 0,
            error: null,
        };

        if (!d.file_path) {
            entry.error = 'no_file_path';
            fileList.push(entry);
            continue;
        }

        try {
            const { data: blob, error: dlErr } = await supabase.storage
                .from(ZIP_BUCKET)
                .download(storagePath(d.file_path));
            if (dlErr || !blob) {
                entry.error = dlErr?.message || 'storage_miss';
                fileList.push(entry);
                continue;
            }
            const buf = Buffer.from(await blob.arrayBuffer());

            const baseName = d.file_name || d.type || 'document';
            let safeName = safeFileName(baseName);
            const folder = personId
                ? null
                : (d.person ? safeSegment(d.person) : 'unassigned');
            let zipPath = folder ? `${folder}/${safeName}` : safeName;
            if (usedPaths.has(zipPath)) {
                const extDot = safeName.lastIndexOf('.');
                const stem = extDot > 0 ? safeName.slice(0, extDot) : safeName;
                const ext = extDot > 0 ? safeName.slice(extDot) : '';
                let counter = 2;
                let candidate = `${stem}-${counter}${ext}`;
                while (usedPaths.has(folder ? `${folder}/${candidate}` : candidate)) {
                    counter += 1;
                    candidate = `${stem}-${counter}${ext}`;
                }
                safeName = candidate;
                zipPath = folder ? `${folder}/${safeName}` : safeName;
            }
            usedPaths.add(zipPath);
            zip.file(zipPath, buf);

            entry.ok = true;
            entry.path = zipPath;
            entry.size = buf.length;
        } catch (e) {
            entry.error = e?.message || 'download_failed';
        }
        fileList.push(entry);
    }

    const okCount = fileList.filter((f) => f.ok).length;

    // 7. Best-effort: include a pre-filled Letter of Intent PDF at the root
    //    of the archive when the download is apartment-scoped and isn't
    //    restricted to a single person's documents (the LOI covers the
    //    whole application, not one person). Never blocks the ZIP — if it
    //    fails, the archive still contains whatever uploaded documents were
    //    found.
    let loiIncluded = false;
    if (apartmentId && !personId) {
        try {
            const loiResult = await buildLetterOfIntentPdf(supabase, accountId, { apartmentId });
            if (loiResult) {
                zip.file(loiResult.filename, loiResult.buffer);
                loiIncluded = true;
            }
        } catch (loiErr) {
            console.warn('[buildApplicationZip] Letter of Intent build failed, continuing without it:', loiErr);
        }
    }

    if (okCount === 0 && !loiIncluded) return null;

    const archiveBuf = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
    });

    const shortId = String(account.id).slice(0, 8);
    const tenantSlug = safeSegment(account.tenant_name) || 'tenant';
    const personSlug = personFilterName ? `-${safeSegment(personFilterName)}` : '';
    const filename = `application-${shortId}-${tenantSlug}${personSlug}.zip`;

    return { buffer: archiveBuf, filename, fileCount: okCount };
}

// --- Letter of Intent PDF builder ---
// Fills the ApartmentHub "Letter of Intent" template (see
// src/lib/pdf/letterOfIntent.js) with the applicant's data so it can be
// attached to the Gmail offer draft and/or bundled into the application ZIP
// download. Best-effort: returns null when the minimum data (an apartment to
// describe) isn't available, so callers can skip the attachment rather than
// failing the whole request.

const LOI_SIGNATURE_TYPE = 'loi_signature';

function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', surname: '' };
    if (parts.length === 1) return { firstName: parts[0], surname: '' };
    return { firstName: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] };
}

function personToLoiFields(p, aiPerson) {
    if (!p) return null;
    const { firstName, surname } = p.voornaam || p.achternaam
        ? { firstName: p.voornaam || '', surname: p.achternaam || '' }
        : splitName(personName(p));
    return {
        firstName,
        surname,
        street: p.huidige_adres || '',
        postcode: p.postcode || '',
        city: p.woonplaats || '',
        email: p.email || '',
        phone: p.telefoon || p.whatsapp || '',
        // date_of_birth isn't a column on `personen` — the AI-extracted
        // profile (dossiers.ai_profile, parsed from uploaded ID documents)
        // is the only source. Passport number is never captured as
        // structured data anywhere, so it's always left for manual entry.
        dateOfBirth: aiPerson?.date_of_birth || '',
        passportNumber: '',
    };
}

/**
 * @param {object} supabase - service-role Supabase client
 * @param {string} accountId - accounts.id
 * @param {object} opts
 * @param {string} opts.apartmentId - apartments.id (required — property details come from here)
 * @param {number} [opts.bidAmount] - override the derived rent amount (e.g. the agent's negotiated figure)
 * @param {string} [opts.startDate] - override the derived start date
 * @param {object} [opts.aiProfile] - dossiers.ai_profile (already fetched by the caller), reused to avoid a duplicate Claude analysis
 * @returns {Promise<{buffer: Uint8Array, filename: string} | null>} null if an apartment or account can't be resolved
 */
export async function buildLetterOfIntentPdf(supabase, accountId, opts = {}) {
    const { apartmentId, bidAmount: bidOverride, startDate: startDateOverride, aiProfile } = opts;
    if (!apartmentId) return null;

    const { data: account, error: accErr } = await supabase
        .from('accounts')
        .select('id, tenant_name, whatsapp_number, email')
        .eq('id', accountId)
        .maybeSingle();
    if (accErr) throw accErr;
    if (!account) return null;

    const { data: apt, error: aptErr } = await supabase
        .from('apartments')
        .select('id, "Full Address", street, area, zip_code, rental_price')
        .eq('id', apartmentId)
        .maybeSingle();
    if (aptErr) throw aptErr;
    if (!apt) return null;

    // ai_profile may not exist in every environment (older schema) — fall
    // back to a query without it rather than throwing, matching the
    // DOSSIER_COLS_SAFE pattern used in generate-offer/route.js.
    let dossierRows;
    const dossierRes = await supabase
        .from('dossiers')
        .select('id, bid_amount, start_date, ai_profile')
        .in('phone_number', phoneCandidates(account.whatsapp_number))
        .order('created_at', { ascending: false })
        .limit(1);
    if (dossierRes.error) {
        const safeRes = await supabase
            .from('dossiers')
            .select('id, bid_amount, start_date')
            .in('phone_number', phoneCandidates(account.whatsapp_number))
            .order('created_at', { ascending: false })
            .limit(1);
        dossierRows = safeRes.data;
    } else {
        dossierRows = dossierRes.data;
    }
    const dossier = dossierRows?.[0] || null;
    const dossierId = dossier?.id || null;
    const personen = dossierId
        ? await fetchIn(supabase, 'personen', '*', 'dossier_id', [dossierId])
        : [];

    const mainPerson = personen.find((p) => isMainTenant(p)) || null;
    const coPerson = personen.find((p) => !isMainTenant(p)) || null;

    let bidAmount = bidOverride != null ? Number(bidOverride) : null;
    if (bidAmount == null && dossier?.bid_amount != null) bidAmount = Number(dossier.bid_amount);
    if (bidAmount == null && apt.rental_price != null) bidAmount = Number(apt.rental_price);
    const startDate = startDateOverride || dossier?.start_date || null;
    const deposit = bidAmount != null ? bidAmount * 2 : null;

    const effectiveAiProfile = aiProfile || dossier?.ai_profile || null;

    const mainTenant = mainPerson
        ? personToLoiFields(mainPerson, effectiveAiProfile?.main_tenant)
        : {
            firstName: splitName(account.tenant_name).firstName,
            surname: splitName(account.tenant_name).surname,
            email: account.email || '',
            phone: account.whatsapp_number || '',
            street: '',
            postcode: '',
            city: '',
            dateOfBirth: '',
            passportNumber: '',
        };
    const coTenant = coPerson
        ? personToLoiFields(coPerson, effectiveAiProfile?.guarantor || effectiveAiProfile?.co_tenants?.[0])
        : null;

    // Best-effort: if the main tenant has already signed via the
    // LetterOfIntent.jsx flow, stamp that signature onto the PDF instead of
    // leaving the signature box blank.
    let signaturePngBytes = null;
    let signedDate = null;
    if (mainPerson) {
        const { data: sigDocs } = await supabase
            .from('documenten')
            .select('bestandspad, file_path, uploaded_at')
            .eq('persoon_id', mainPerson.id)
            .eq('type', LOI_SIGNATURE_TYPE)
            .order('uploaded_at', { ascending: false })
            .limit(1);
        const sigDoc = sigDocs?.[0] || null;
        const sigPath = sigDoc?.bestandspad || sigDoc?.file_path || null;
        if (sigPath) {
            try {
                const { data: blob, error: dlErr } = await supabase.storage
                    .from(ZIP_BUCKET)
                    .download(storagePath(sigPath));
                if (!dlErr && blob) {
                    signaturePngBytes = Buffer.from(await blob.arrayBuffer());
                    signedDate = sigDoc.uploaded_at || null;
                }
            } catch (sigErr) {
                console.warn('[buildLetterOfIntentPdf] signature download failed, leaving box blank:', sigErr);
            }
        }
    }

    const pdfBytes = await generateLetterOfIntentPdf({
        mainTenant,
        coTenant,
        property: {
            street: apt['Full Address'] || apt.street || '',
            postcode: apt.zip_code || '',
            city: apt.area || '',
            rentPrice: bidAmount,
            deposit,
            startDate,
            monthsUpfront: 1,
        },
        signaturePngBytes,
        signedPlace: apt.area || 'Amsterdam',
        signedDate,
    });

    const shortId = String(account.id).slice(0, 8);
    const tenantSlug = safeSegment(account.tenant_name) || 'tenant';
    const filename = `letter-of-intent-${shortId}-${tenantSlug}.pdf`;

    return { buffer: Buffer.from(pdfBytes), filename };
}
