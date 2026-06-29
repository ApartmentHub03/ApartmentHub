import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// Apartment brochure PDF — upload to the private "Apartment Doc" bucket and
// record its path on the apartment (booking_details.brochure_pdf). GET returns
// a fresh signed URL. CRM-authed.

const BUCKET = 'Apartment Doc';
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function GET(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const supabase = serviceClient();
        const { data: apt } = await supabase.from('apartments').select('booking_details').eq('id', id).maybeSingle();
        const pdf = apt?.booking_details?.brochure_pdf;
        if (!pdf?.path) return NextResponse.json({ success: true, pdf: null });
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(pdf.path, 3600);
        return NextResponse.json({ success: true, pdf: { ...pdf, url: signed?.signedUrl || null } });
    } catch (err) {
        console.error('[crm/apartment pdf GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
        }
        if (file.type && file.type !== 'application/pdf') {
            return NextResponse.json({ success: false, message: 'Only PDF files are allowed' }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ success: false, message: 'PDF exceeds 20 MB' }, { status: 400 });
        }

        const supabase = serviceClient();
        const safeName = (file.name || 'brochure.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `apartments/${id}/${Date.now()}_${safeName}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
            contentType: 'application/pdf', upsert: true,
        });
        if (upErr) throw upErr;

        const { data: apt } = await supabase.from('apartments').select('booking_details').eq('id', id).maybeSingle();
        const bookingDetails = (apt?.booking_details && typeof apt.booking_details === 'object') ? apt.booking_details : {};
        const brochure_pdf = { path, name: safeName, uploaded_at: new Date().toISOString() };

        const { error: updErr } = await supabase
            .from('apartments')
            .update({ booking_details: { ...bookingDetails, brochure_pdf } })
            .eq('id', id);
        if (updErr) throw updErr;

        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        return NextResponse.json({ success: true, pdf: { ...brochure_pdf, url: signed?.signedUrl || null } });
    } catch (err) {
        console.error('[crm/apartment pdf POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
