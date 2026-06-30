import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// Full apartment record + edit/delete for the CRM detail view. CRM-authed.

const STATUSES = ['Null', 'CreateLink', 'Active', 'Closed'];

// Only these columns may be updated from the CRM edit form.
// NOTE: the live table has no `name` column — "Full Address" is the identifier,
// so both `name` and `fullAddress` from the form map to it (handled below).
const EDITABLE = {
    fullAddress: null, // mapped below to "Full Address"
    name: null,        // also mapped to "Full Address"
    street: (v) => v || null,
    area: (v) => v || null,
    zip_code: (v) => v || null,
    rental_price: (v) => (v === '' || v == null ? null : Number(v)),
    bedrooms: (v) => (v == null ? null : String(v)),
    square_meters: (v) => (v === '' || v == null ? null : Number(v)),
    additional_notes: (v) => v || null,
    lengthInMins: (v) => (v === '' || v == null ? null : Number(v)),
    slotInterval: (v) => (v === '' || v == null ? null : Number(v)),
    status: (v) => (STATUSES.includes(v) ? v : undefined),
};

export async function GET(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const { data, error } = await serviceClient()
            .from('apartments')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });
        return NextResponse.json({ success: true, apartment: data });
    } catch (err) {
        console.error('[crm/apartment GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const body = await request.json();
        const update = {};
        for (const [key, coerce] of Object.entries(EDITABLE)) {
            if (!(key in body)) continue;
            // `name` and `fullAddress` both write to "Full Address" (fullAddress wins).
            if (key === 'fullAddress' || key === 'name') {
                const v = body.fullAddress || body.name;
                if (v) update['Full Address'] = v;
                continue;
            }
            const val = coerce(body[key]);
            if (val !== undefined) update[key] = val;
        }
        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
        }
        const { data, error } = await serviceClient()
            .from('apartments').update(update).eq('id', id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, apartment: data });
    } catch (err) {
        console.error('[crm/apartment PATCH]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const { error } = await serviceClient().from('apartments').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[crm/apartment DELETE]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
