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
    const { address, slotDatetime, slotLengthMinutes, viewingType, whatsappNumber } = await request.json();

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

        const startTime = new Date(slotDatetime);
        const endTime = new Date(startTime.getTime() + Number(slotLengthMinutes) * 60000);

        const slotStartHH = getAmsterdamTime(startTime);
        const slotEndHH = getAmsterdamTime(endTime);
        const slotDate = getAmsterdamDate(startTime);

        // Step 1: Create a schedule with the exact time window
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

        // Step 2: Set location based on viewing type
        const locations = viewingType === 'video'
            ? [{ type: 'integration', integration: 'cal-video' }]
            : [{ type: 'address', address, public: true }];

        // Step 3: Custom booking fields
        const bookingFields = [
            {
                type: 'phone',
                slug: 'whatsapp',
                label: 'WhatsApp',
                required: true,
                placeholder: '+31 612345678',
            },
            {
                type: 'select',
                slug: 'viewing-type',
                label: 'Viewing Type',
                required: true,
                options: ['In-Person', 'Video-Viewing'],
            },
        ];

        // Step 4: Create the event type linked to the schedule
        const eventData = await calFetch('/event-types', apiKey, '2024-06-14', {
            method: 'POST',
            body: JSON.stringify({
                title: address,
                slug,
                lengthInMinutes: Number(slotLengthMinutes),
                locations,
                bookingFields,
                scheduleId,
            }),
        });

        if (eventData.status === 'success' && eventData.data) {
            const bookingUrl = eventData.data.bookingUrl;

            const viewingLabel = viewingType === 'video' ? 'Video-Viewing' : 'In-Person';
            const slotParam = startTime.toISOString().split('.')[0] + 'Z';

            const params = new URLSearchParams({
                date: slotDate,
                slot: slotParam,
                whatsapp: whatsappNumber || '',
                'viewing-type': viewingLabel,
            });

            const eventlink = `${bookingUrl}?${params.toString()}`;

            return NextResponse.json({ success: true, eventlink });
        }

        return NextResponse.json({
            success: false,
            message: eventData.error?.message || 'Failed to create Cal.com event type',
            details: eventData,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
