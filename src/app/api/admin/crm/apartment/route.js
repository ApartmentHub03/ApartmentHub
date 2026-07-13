import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Create an apartment listing. CRM-authed.

const STATUSES = ['Null', 'CreateLink', 'Active', 'Closed'];

export async function POST(request) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const b = await request.json();
        // The live apartments table has no `name` column — "Full Address" is the
        // identifying field. The form's name input maps to it when no explicit
        // full address is given.
        const fullAddress = (b.fullAddress || b.address || b.name || '').trim();
        if (!fullAddress) {
            return NextResponse.json({ success: false, message: 'Apartment name / address is required' }, { status: 400 });
        }
        const status = STATUSES.includes(b.status) ? b.status : 'Null';

        const row = {
            'Full Address': fullAddress,
            street: b.street || null,
            area: b.area || b.city || null,
            zip_code: b.zip_code || null,
            rental_price: b.rental_price != null && b.rental_price !== '' ? Number(b.rental_price) : null,
            bedrooms: b.bedrooms != null ? String(b.bedrooms) : null,
            square_meters: b.square_meters != null && b.square_meters !== '' ? Number(b.square_meters) : null,
            additional_notes: b.additional_notes || null,
            lengthInMins: b.lengthInMins != null && b.lengthInMins !== '' ? Number(b.lengthInMins) : null,
            slotInterval: b.slotInterval != null && b.slotInterval !== '' ? Number(b.slotInterval) : null,
            status,
        };

        const { data, error } = await serviceClient().from('apartments').insert(row).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, apartment: data });
    } catch (err) {
        return failed('crm/apartment POST', err, 'Failed to create apartment');
    }
}
