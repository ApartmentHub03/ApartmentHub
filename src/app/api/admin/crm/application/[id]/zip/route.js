import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import {
    fetchIn, personName, phoneCandidates, roleLabel, storagePath,
} from '@/services/crmApplications';

// Download all (or one person's) uploaded documents for a tenant application
// as a single ZIP. CRM-authed via the same `candidates` permission as the
// detail GET next door. Mirrors the selling-dossier ZIP route
// (`src/app/api/dashboard-selling/dossiers/[id]/zip/route.ts`).
//
// Query params:
//   personId   optional. Restricts the archive to one person's documents.
//              When absent, every document on the account's dossier is
//              included, grouped into per-person folders.
//   apartmentId  optional. Only used to surface context in manifest.json —
//                the ZIP is account-scoped either way. The frontend passes
//                it when the download is initiated from an apartment-scoped
//                application view so the audit trail knows which listing
//                the operator was looking at.
//
// Files are pulled from Supabase Storage with the service role (no RLS) —
// the detail GET uses signed URLs, but for a bulk download it's simpler
// and faster to read the bytes server-side and stream them into the zip.
//
// Missing files (row exists, blob 404) are recorded in manifest.json and
// skipped rather than failing the whole archive.

const BUCKET = 'dossier-documents';

// Internal document types that should not appear in the tenant-facing ZIP.
// Add more types here as needed.
const INTERNAL_DOC_TYPES = ['loi_signature'];

function safeSegment(s) {
    return String(s || '')
        .replace(/[^A-Za-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'unnamed';
}

// Sanitize a filename for zip storage without clobbering the extension.
// safeSegment('loonstroken-1.png') would turn the '.png' into '-png', so we
// split on the LAST dot: sanitize the stem separately and reattach the ext.
// Multi-dot names ('passport.scan.v2.pdf') keep only the final extension;
// the intermediate dots collapse into the stem via safeSegment.
function safeFileName(s) {
    const raw = String(s || '');
    const dot = raw.lastIndexOf('.');
    if (dot <= 0) return safeSegment(raw) || 'document';
    const stem = raw.slice(0, dot);
    const ext = raw.slice(dot + 1).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const safeStem = safeSegment(stem) || 'document';
    return ext ? `${safeStem}.${ext}` : safeStem;
}

export async function GET(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    const url = new URL(request.url);
    const personId = url.searchParams.get('personId');
    const apartmentId = url.searchParams.get('apartmentId');

    try {
        const supabase = serviceClient();

        // 1. Load the account (same column set as the detail GET — see
        //    application/[id]/route.js). The CRM-side `documents` JSONB mirror
        //    is only a fallback for legacy rows without a dossier; the real
        //    chain is dossiers -> personen -> documenten.
        const { data: account, error: accErr } = await supabase
            .from('accounts')
            .select('id, tenant_name, whatsapp_number, email, nationality, work_status, monthly_income, current_address, current_zipcode, preferred_location, move_in_date, negotiation_notes, co_tenants, documents, documentation_status, offered_apartments, apartments_applied_for, account_role, status')
            .eq('id', id)
            .maybeSingle();
        if (accErr) throw accErr;
        if (!account) {
            return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });
        }

        // 2. Resolve the dossier behind this account by phone — same lookup
        //    as the detail GET.
        const { data: dossierRows } = await supabase
            .from('dossiers')
            .select('id, bid_amount, start_date, motivation, months_advance')
            .in('phone_number', phoneCandidates(account.whatsapp_number))
            .order('created_at', { ascending: false })
            .limit(1);
        const dossier = dossierRows?.[0] || null;
        const dossierId = dossier?.id || null;

        // 3. People + their documents. `select('*')` because the schemas have
        //    shifted (naam -> voornaam/achternaam, file_path -> bestandspad)
        //    and naming a column that no longer exists 400s the whole query.
        const personen = dossierId
            ? await fetchIn(supabase, 'personen', '*', 'dossier_id', [dossierId])
            : [];
        const documenten = personen.length
            ? await fetchIn(supabase, 'documenten', '*', 'persoon_id', personen.map((p) => p.id))
            : [];

        const personById = new Map(personen.map((p) => [p.id, p]));

        // 4. Normalise to one doc shape — same mapping as the detail GET.
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

        // 5. Apply the optional personId filter and drop internal-only
        //    documents (signatures, agent notes, etc.). Match on
        //    documenten.persoon_id when present; for the legacy JSONB-mirror
        //    fallback rows, match on person name as the detail view does
        //    (views.tsx:1324-1327).
        let filtered = rawDocs.filter((d) => !INTERNAL_DOC_TYPES.includes(d.type));
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

        // 6. Build the zip. Per-person folders when no filter, flat when
        //    filtered to one person (the folder adds nothing in that case).
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
                    .from(BUCKET)
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
                // Deduplicate paths inside the ZIP so two files with the same
                // sanitized name don't overwrite each other.
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
        if (okCount === 0) {
            return NextResponse.json({
                success: false,
                message: 'No downloadable files found for this application',
                file_count: filtered.length,
                missing_paths: fileList.filter((f) => f.error === 'no_file_path').map((f) => f.type),
                download_errors: fileList.filter((f) => f.error && f.error !== 'no_file_path').map((f) => ({ type: f.type, error: f.error })),
            }, { status: 404 });
        }

        const archiveBuf = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
        });

        const shortId = String(account.id).slice(0, 8);
        const tenantSlug = safeSegment(account.tenant_name) || 'tenant';
        const personSlug = personFilterName ? `-${safeSegment(personFilterName)}` : '';
        const filename = `application-${shortId}-${tenantSlug}${personSlug}.zip`;

        console.log('[crm/application/zip] generated', {
            account_id: id,
            file_count: filtered.length,
            ok_count: okCount,
            size: archiveBuf.byteLength,
            personId: personId || null,
            personFilterName,
        });

        return new NextResponse(archiveBuf, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': String(archiveBuf.byteLength),
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        return failed('crm/application/zip GET', err, 'Failed to generate ZIP');
    }
}