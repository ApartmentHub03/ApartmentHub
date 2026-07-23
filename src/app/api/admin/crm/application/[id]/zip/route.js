import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { buildApplicationZip } from '@/services/crmApplications';

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
// The ZIP-building logic lives in the shared `buildApplicationZip` helper
// (src/services/crmApplications.js) so the generate-offer Gmail draft route
// can attach the same archive without duplicating the fetch + Storage
// download + JSZip logic.

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

        const zipResult = await buildApplicationZip(supabase, id, { personId, apartmentId });

        if (!zipResult) {
            return NextResponse.json({
                success: false,
                message: 'No downloadable files found for this application',
            }, { status: 404 });
        }

        console.log('[crm/application/zip] generated', {
            account_id: id,
            file_count: zipResult.fileCount,
            size: zipResult.buffer.byteLength,
            personId: personId || null,
        });

        return new NextResponse(zipResult.buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipResult.filename}"`,
                'Content-Length': String(zipResult.buffer.byteLength),
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        return failed('crm/application/zip GET', err, 'Failed to generate ZIP');
    }
}