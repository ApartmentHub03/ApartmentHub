import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Apartment brochure / attachment — upload to the private "Apartment Doc"
// bucket and record its path on the apartment (booking_details.brochure_pdf).
// GET returns a fresh signed URL. PDF is recommended but any file type / size
// is accepted.
//
// Two-phase upload to bypass the Vercel serverless 4.5MB body limit:
//   1. POST { filename, contentType } → returns { uploadUrl, path, token }
//   2. Client PUTs the raw file to uploadUrl (Supabase Storage, no size limit)
//   3. POST { path, name } → records the path on the apartment row

const BUCKET = 'Apartment Doc';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request, { params }) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const supabase = serviceClient();
        const { data: apt } = await supabase.from('apartments').select('booking_details').eq('id', id).maybeSingle();
        const pdf = apt?.booking_details?.brochure_pdf;
        if (!pdf?.path) return NextResponse.json({ success: true, pdf: null });
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(pdf.path, 3600);
        return NextResponse.json({ success: true, pdf: { ...pdf, url: signed?.signedUrl || null } });
    } catch (err) {
        return failed('crm/apartment pdf GET', err, 'Failed to load the brochure');
    }
}

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const supabase = serviceClient();

        // Confirm the apartment exists before doing anything.
        const { data: apt, error: aptErr } = await supabase
            .from('apartments').select('booking_details').eq('id', id).maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const contentType = request.headers.get('content-type') || '';

        // Phase 1: sign — client wants a pre-signed upload URL.
        if (contentType.includes('application/json')) {
            const body = await request.json();
            if (body.path && body.name) {
                // Phase 3: finalize — record the uploaded path on the apartment.
                const bookingDetails = (apt.booking_details && typeof apt.booking_details === 'object') ? apt.booking_details : {};
                const safeName = String(body.name).replace(/[^a-zA-Z0-9._-]/g, '_');
                const brochure_pdf = { path: body.path, name: safeName, uploaded_at: new Date().toISOString() };

                const { error: updErr } = await supabase
                    .from('apartments')
                    .update({ booking_details: { ...bookingDetails, brochure_pdf } })
                    .eq('id', id);
                if (updErr) throw updErr;

                const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(body.path, 3600);
                return NextResponse.json({ success: true, pdf: { ...brochure_pdf, url: signed?.signedUrl || null } });
            }

            // Phase 1: generate a signed upload URL.
            const filename = body.filename || 'brochure';
            const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `apartments/${id}/${Date.now()}_${safeName}`;

            const { data: signData, error: signErr } = await supabase.storage
                .from(BUCKET).createSignedUploadUrl(path);
            if (signErr) throw signErr;

            return NextResponse.json({
                success: true,
                path,
                uploadUrl: signData.signedUrl,
                token: signData.token || null,
            });
        }

        return NextResponse.json({ success: false, message: 'Content-Type must be application/json' }, { status: 400 });
    } catch (err) {
        return failed('crm/apartment pdf POST', err, 'Failed to upload the brochure');
    }
}