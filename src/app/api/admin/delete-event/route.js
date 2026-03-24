import { NextResponse } from 'next/server';

const CAL_API_BASE = 'https://api.cal.com/v2';

async function calDelete(path, apiKey, apiVersion) {
    const res = await fetch(`${CAL_API_BASE}${path}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'cal-api-version': apiVersion,
        },
    });
    if (res.status === 204) return { status: 'success' };
    return res.json();
}

export async function POST(request) {
    const { calEventTypeId, calScheduleId } = await request.json();

    const apiKey = process.env.CAL_COM_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { success: false, message: 'CAL_COM_API_KEY not configured' },
            { status: 500 }
        );
    }

    const errors = [];

    try {
        if (calEventTypeId) {
            const result = await calDelete(`/event-types/${calEventTypeId}`, apiKey, '2024-06-14');
            if (result.status !== 'success') {
                errors.push({ type: 'event-type', details: result });
            }
        }

        if (calScheduleId) {
            const result = await calDelete(`/schedules/${calScheduleId}`, apiKey, '2024-06-11');
            if (result.status !== 'success') {
                errors.push({ type: 'schedule', details: result });
            }
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }

    if (errors.length > 0) {
        return NextResponse.json({ success: false, errors });
    }

    return NextResponse.json({ success: true });
}
