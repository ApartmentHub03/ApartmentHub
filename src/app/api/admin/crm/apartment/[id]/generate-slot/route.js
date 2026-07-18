import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { createCalLinks } from '@/services/calcom';

// "Generate Nieuwe Slot" — creates a Cal.com schedule + in-person/video event
// types for this apartment, then saves the bookable links onto the apartment
// (event_link + slot_dates + booking_details). CRM-authed.

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const { start, end, slotLengthMinutes } = await request.json();
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

        // Call the Cal.com generator in-process. Self-fetching our own HTTP
        // route would rebuild the origin from the Host header (spoofable) and
        // could not carry this request's credentials.
        const cal = await createCalLinks({
            address,
            slotStartDatetime: start,
            slotEndDatetime: end,
            slotLengthMinutes: Number(slotLengthMinutes),
        });
        if (!cal.success || (!cal.eventlink && !cal.eventlinkVideo)) {
            return NextResponse.json({ success: false, message: cal.message || 'Cal.com link generation failed' }, { status: 502 });
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
                event_link: cal.eventlink || cal.eventlinkVideo,
                eventlink_video: cal.eventlinkVideo || null,
                slot_dates: [...slotDates, slot],
                booking_details: { ...bookingDetails, latest_slot: slot },
                status: (apt.status === 'Null' || !apt.status || apt.status === 'CreateLink') ? 'Active' : apt.status,
                cal_event_type_id: cal.calEventTypeId || null,
                cal_event_type_id_video: cal.calEventTypeIdVideo || null,
                cal_schedule_id: cal.calScheduleId || null,
            })
            .eq('id', id)
            .select()
            .single();
        if (upErr) throw upErr;

        return NextResponse.json({ success: true, slot, apartment: updated });
    } catch (err) {
        return failed('crm/generate-slot POST', err, 'Failed to generate the slot');
    }
}
