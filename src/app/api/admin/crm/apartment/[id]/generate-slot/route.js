import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// "Generate Nieuwe Slot" — creates a Cal.com schedule + in-person/video event
// types for this apartment (via the existing /api/admin/generate-link), then
// saves the bookable links onto the apartment (event_link + slot_dates +
// booking_details). CRM-authed.

export async function POST(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const { start, end, slotLengthMinutes, viewingType } = await request.json();
        if (!start || !end || !slotLengthMinutes) {
            return NextResponse.json({ success: false, message: 'start, end and slotLengthMinutes are required' }, { status: 400 });
        }

        const supabase = serviceClient();
        const { data: apt, error } = await supabase
            .from('apartments')
            .select('id, "Full Address", street, slot_dates, booking_details, status')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const address = apt['Full Address'] || apt.street;
        if (!address) {
            return NextResponse.json({ success: false, message: 'Apartment has no address to build a link from' }, { status: 400 });
        }

        // Reuse the existing, tested Cal.com link generator.
        const origin = new URL(request.url).origin;
        const calRes = await fetch(`${origin}/api/admin/generate-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address,
                slotStartDatetime: start,
                slotEndDatetime: end,
                slotLengthMinutes: Number(slotLengthMinutes),
                viewingType: viewingType || 'inPerson',
            }),
        });
        const cal = await calRes.json();
        if (!cal.success || (!cal.eventlink && !cal.eventlinkVideo)) {
            return NextResponse.json({ success: false, message: cal.message || 'Cal.com link generation failed', details: cal }, { status: 502 });
        }

        const slot = {
            start, end,
            length_minutes: Number(slotLengthMinutes),
            eventlink: cal.eventlink || null,
            eventlink_video: cal.eventlinkVideo || null,
            cal_schedule_id: cal.calScheduleId || null,
            cal_event_type_id: cal.calEventTypeId || null,
            cal_event_type_id_video: cal.calEventTypeIdVideo || null,
            created_at: new Date().toISOString(),
        };
        const slotDates = Array.isArray(apt.slot_dates) ? apt.slot_dates : [];
        const bookingDetails = (apt.booking_details && typeof apt.booking_details === 'object') ? apt.booking_details : {};

        const { data: updated, error: upErr } = await supabase
            .from('apartments')
            .update({
                event_link: cal.eventlink || null,
                slot_dates: [...slotDates, slot],
                booking_details: { ...bookingDetails, latest_slot: slot },
                status: apt.status === 'Null' || !apt.status ? 'CreateLink' : apt.status,
            })
            .eq('id', id)
            .select()
            .single();
        if (upErr) throw upErr;

        return NextResponse.json({ success: true, slot, apartment: updated });
    } catch (err) {
        console.error('[crm/generate-slot POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
