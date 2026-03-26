import { NextResponse } from 'next/server';

const CAL_API_BASE = 'https://api.cal.com/v2';

async function calFetch(path, apiKey, apiVersion, options = {}) {
    const res = await fetch(`${CAL_API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'cal-api-version': apiVersion,
            ...options.headers,
        },
    });
    return res.json();
}

function getAmsterdamTime(date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam',
    }).formatToParts(date);
    const h = parts.find(p => p.type === 'hour').value;
    const m = parts.find(p => p.type === 'minute').value;
    return `${h}:${m}`;
}

function getAmsterdamDate(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Amsterdam',
    }).formatToParts(date);
    const y = parts.find(p => p.type === 'year').value;
    const mo = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    return `${y}-${mo}-${d}`;
}

export async function POST(request) {
    const { address, slotStartDatetime, slotEndDatetime, slotLengthMinutes } = await request.json();

    const apiKey = process.env.CAL_COM_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { success: false, message: 'CAL_COM_API_KEY not configured' },
            { status: 500 }
        );
    }

    try {
        const slug = address
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 40);

        const startTime = new Date(slotStartDatetime);
        const endTime = new Date(slotEndDatetime);

        const slotStartHH = getAmsterdamTime(startTime);
        const slotEndHH = getAmsterdamTime(endTime);
        const slotDate = getAmsterdamDate(startTime);

        // Step 1: Create a schedule with availability from start time to end time
        const scheduleData = await calFetch('/schedules', apiKey, '2024-06-11', {
            method: 'POST',
            body: JSON.stringify({
                name: address,
                timeZone: 'Europe/Amsterdam',
                availability: [
                    {
                        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                        startTime: slotStartHH,
                        endTime: slotEndHH,
                    },
                ],
                isDefault: false,
            }),
        });

        if (scheduleData.status !== 'success' || !scheduleData.data) {
            return NextResponse.json({
                success: false,
                message: 'Failed to create Cal.com schedule',
                details: scheduleData,
            });
        }

        const scheduleId = scheduleData.data.id;

        // Custom booking fields (no viewing-type select since we generate separate links)
        const bookingFields = [
            {
                type: 'phone',
                slug: 'whatsapp',
                label: 'WhatsApp',
                required: true,
                placeholder: '+31 612345678',
            },
        ];

        // Restrict bookable dates to the admin-selected range
        const slotEndDate = getAmsterdamDate(endTime);
        const bookingWindow = {
            type: 'range',
            value: [slotDate, slotEndDate],
        };

        // Step 2: Create In-Person event type
        const inPersonEvent = await calFetch('/event-types', apiKey, '2024-06-14', {
            method: 'POST',
            body: JSON.stringify({
                title: `${address} (In-Person)`,
                slug: `${slug}-inperson`,
                lengthInMinutes: Number(slotLengthMinutes),
                locations: [{ type: 'address', address, public: true }],
                bookingFields,
                bookingWindow,
                scheduleId,
            }),
        });

        // Step 3: Create Video event type
        const videoEvent = await calFetch('/event-types', apiKey, '2024-06-14', {
            method: 'POST',
            body: JSON.stringify({
                title: `${address} (Video)`,
                slug: `${slug}-video`,
                lengthInMinutes: Number(slotLengthMinutes),
                locations: [{ type: 'integration', integration: 'cal-video' }],
                bookingFields,
                bookingWindow,
                scheduleId,
            }),
        });

        const results = {};

        // Build in-person link
        if (inPersonEvent.status === 'success' && inPersonEvent.data) {
            const params = new URLSearchParams({ date: slotDate });
            results.eventlink = `${inPersonEvent.data.bookingUrl}?${params.toString()}`;
            results.calEventTypeId = inPersonEvent.data.id;
        }

        // Build video link
        if (videoEvent.status === 'success' && videoEvent.data) {
            const params = new URLSearchParams({ date: slotDate });
            results.eventlinkVideo = `${videoEvent.data.bookingUrl}?${params.toString()}`;
            results.calEventTypeIdVideo = videoEvent.data.id;
        }

        if (!results.eventlink && !results.eventlinkVideo) {
            return NextResponse.json({
                success: false,
                message: 'Failed to create Cal.com event types',
                details: { inPersonEvent, videoEvent },
            });
        }

        return NextResponse.json({
            success: true,
            eventlink: results.eventlink || null,
            eventlinkVideo: results.eventlinkVideo || null,
            calEventTypeId: results.calEventTypeId || null,
            calEventTypeIdVideo: results.calEventTypeIdVideo || null,
            calScheduleId: scheduleId,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
