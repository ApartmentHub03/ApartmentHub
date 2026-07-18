import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { deleteCalEvents } from '@/services/calcom';

// "Close listing" — admin-only. Tears down the apartment's Cal.com event
// types + schedule (so tenants can no longer book viewings) and flips the
// apartment status to "Closed". Cal.com cleanup failures are logged but do
// not block the status update — the listing is closed in our DB regardless.

export async function POST(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const supabase = serviceClient();

        const { data: apt, error: fetchErr } = await supabase
            .from('apartments')
            .select('id, status, cal_event_type_id, cal_event_type_id_video, cal_schedule_id')
            .eq('id', id)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        if (apt.status === 'Closed') {
            return NextResponse.json({ success: false, message: 'Apartment is already closed' }, { status: 409 });
        }

        // Tear down Cal.com event types + schedule if they exist.
        let calWarnings = [];
        if (apt.cal_event_type_id || apt.cal_event_type_id_video || apt.cal_schedule_id) {
            try {
                const calResult = await deleteCalEvents({
                    calEventTypeId: apt.cal_event_type_id,
                    calEventTypeIdVideo: apt.cal_event_type_id_video,
                    calScheduleId: apt.cal_schedule_id,
                });
                if (!calResult.success) {
                    calWarnings = calResult.errors.map((e) => e.type);
                }
            } catch (calErr) {
                console.error('[crm/close] Cal.com cleanup failed:', calErr);
                calWarnings = ['calcom-cleanup-failed'];
            }
        }

        // Flip status to Closed regardless of Cal.com outcome.
        const { data: updated, error: upErr } = await supabase
            .from('apartments')
            .update({ status: 'Closed' })
            .eq('id', id)
            .select()
            .single();
        if (upErr) throw upErr;

        return NextResponse.json({
            success: true,
            message: calWarnings.length
                ? `Apartment closed — Cal.com cleanup had issues: ${calWarnings.join(', ')}`
                : 'Apartment closed — Cal.com event types and schedule removed',
            apartment: updated,
            cal_warnings: calWarnings,
        });
    } catch (err) {
        return failed('crm/close POST', err, 'Failed to close apartment');
    }
}