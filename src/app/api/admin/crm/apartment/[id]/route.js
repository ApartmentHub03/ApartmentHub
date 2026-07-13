import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Full apartment record + edit/delete for the CRM detail view.
// Read/edit need the "apartments" permission; DELETE is admin-only — it is a
// hard delete that also takes the apartment's viewing_participants and
// slot_dates (i.e. live bookings) with it.

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
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

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
        return failed('crm/apartment GET', err, 'Failed to load apartment');
    }
}

export async function PATCH(request, { params }) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

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
        return failed('crm/apartment PATCH', err, 'Failed to update apartment');
    }
}

export async function DELETE(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const { error } = await serviceClient().from('apartments').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return failed('crm/apartment DELETE', err, 'Failed to delete apartment');
    }
}
