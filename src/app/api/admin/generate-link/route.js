import { NextResponse } from 'next/server';
import { requireCrmUser } from '@/services/crmAuth';
import { createCalLinks } from '@/services/calcom';

// Creates the Cal.com schedule + event type for an apartment and returns the
// bookable links. Team-only: it spends Cal.com quota and publishes a public
// booking page under our account.

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

    const { address, slotStartDatetime, slotEndDatetime, slotLengthMinutes } = body || {};
    if (!address || !slotStartDatetime || !slotEndDatetime || !slotLengthMinutes) {
        return NextResponse.json(
            { success: false, message: 'address, slotStartDatetime, slotEndDatetime and slotLengthMinutes are required' },
            { status: 400 }
        );
    }

    try {
        const result = await createCalLinks({ address, slotStartDatetime, slotEndDatetime, slotLengthMinutes });
        if (!result.success) {
            console.error('[admin/generate-link] createCalLinks failed:', result);
            return NextResponse.json({ success: false, message: result.message }, { status: 502 });
        }
        return NextResponse.json(result);
    } catch (error) {
        console.error('[admin/generate-link]', error);
        return NextResponse.json({ success: false, message: 'Failed to generate booking link' }, { status: 500 });
    }
}
