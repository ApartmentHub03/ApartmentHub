import { NextResponse } from 'next/server';
import { requireCrmUser } from '@/services/crmAuth';
import { deleteCalEvents } from '@/services/calcom';

// Deletes an apartment's Cal.com event types + schedule. Team-only: these IDs
// are small sequential integers, so an open endpoint here means anyone can
// destroy every live viewing link we have.

export async function POST(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }

    const { calEventTypeId, calEventTypeIdVideo, calScheduleId } = body || {};

    try {
        const result = await deleteCalEvents({ calEventTypeId, calEventTypeIdVideo, calScheduleId });
        if (!result.success) {
            return NextResponse.json({ success: false, errors: result.errors });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin/delete-event]', error);
        return NextResponse.json({ success: false, message: 'Failed to delete Cal.com events' }, { status: 500 });
    }
}
