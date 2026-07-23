import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Apartment brochure / attachment — upload to the private "Apartment Doc"
// bucket and record its path on the apartment (booking_details.brochure_pdf).
// GET returns a fresh signed URL. PDF is recommended but any file type / size
// is accepted.

const BUCKET = 'Apartment Doc';

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
    // `id` becomes a storage object key below, so it has to be a real UUID
    // before it is interpolated into a path.
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
        }

        const supabase = serviceClient();

        // Confirm the apartment exists BEFORE writing to the bucket, so a bad id
        // can't leave an orphaned file behind.
        const { data: apt, error: aptErr } = await supabase
            .from('apartments').select('booking_details').eq('id', id).maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const safeName = (file.name || 'brochure.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `apartments/${id}/${Date.now()}_${safeName}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
            contentType: file.type || 'application/octet-stream', upsert: true,
        });
        if (upErr) throw upErr;

        const bookingDetails = (apt.booking_details && typeof apt.booking_details === 'object') ? apt.booking_details : {};
        const brochure_pdf = { path, name: safeName, uploaded_at: new Date().toISOString() };

        const { error: updErr } = await supabase
            .from('apartments')
            .update({ booking_details: { ...bookingDetails, brochure_pdf } })
            .eq('id', id);
        if (updErr) throw updErr;

        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        return NextResponse.json({ success: true, pdf: { ...brochure_pdf, url: signed?.signedUrl || null } });
    } catch (err) {
        return failed('crm/apartment pdf POST', err, 'Failed to upload the brochure');
    }
}
