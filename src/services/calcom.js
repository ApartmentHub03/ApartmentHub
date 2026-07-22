// Cal.com scheduling calls, shared by the admin dashboard, the CRM slot
// manager, and their HTTP routes. Callers run server-side and hold
// CAL_COM_API_KEY; the HTTP routes in /api/admin/{generate-link,delete-event}
// are thin CRM-authed wrappers around these functions.

const CAL_API_BASE = 'https://api.cal.com/v2';

function apiKey() {
    const key = process.env.CAL_COM_API_KEY;
    if (!key) throw new Error('CAL_COM_API_KEY not configured');
    return key;
}

async function calFetch(path, apiVersion, options = {}) {
    const res = await fetch(`${CAL_API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey()}`,
            'cal-api-version': apiVersion,
            ...options.headers,
        },
    });
    return res.json();
}

async function calDelete(path, apiVersion) {
    const res = await fetch(`${CAL_API_BASE}${path}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${apiKey()}`,
            'cal-api-version': apiVersion,
        },
    });
    if (res.status === 204) return { status: 'success' };
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

// Creates a Cal.com schedule plus the in-person or video event type for an
// apartment, and returns the bookable links. Resolves to { success: false }
// rather than throwing when Cal.com rejects the request.
export async function createCalLinks({ address, slotStartDatetime, slotEndDatetime, slotLengthMinutes }) {
    if (!address) return { success: false, message: 'address is required' };

    const slugBase = address.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = new Date(slotStartDatetime);
    const endTime = new Date(slotEndDatetime);

    const slotStartHH = getAmsterdamTime(startTime);
    const slotEndHH = getAmsterdamTime(endTime);
    const slotDate = getAmsterdamDate(startTime);

    const scheduleData = await calFetch('/schedules', '2024-06-11', {
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
        return { success: false, message: 'Failed to create Cal.com schedule' };
    }

    const scheduleId = scheduleData.data.id;

    const bookingFields = [
        {
            type: 'phone',
            slug: 'whatsapp',
            label: 'WhatsApp',
            required: true,
            placeholder: '+31 612345678',
        },
    ];

    // Restrict bookable dates to the selected range.
    const bookingWindow = {
        type: 'range',
        value: [slotDate, getAmsterdamDate(endTime)],
    };

    const inPersonEvent = await calFetch('/event-types', '2024-06-14', {
        method: 'POST',
        body: JSON.stringify({
            title: `${address} (In-Person)`,
            slug: `${slug}-inperson`,
            lengthInMinutes: Number(slotLengthMinutes),
            locations: [{ type: 'address', address, public: true }],
            bookingFields,
            bookingWindow,
            scheduleId,
            color: { lightThemeHex: '#8b5e3c', darkThemeHex: '#c9a574' },
        }),
    });

    const videoEvent = await calFetch('/event-types', '2024-06-14', {
        method: 'POST',
        body: JSON.stringify({
            title: `${address} (Video)`,
            slug: `${slug}-video`,
            lengthInMinutes: Number(slotLengthMinutes),
            locations: [{ type: 'attendeePhone' }],
            description: 'We will call you with WhatsApp at the booked time.',
            bookingFields, bookingWindow, scheduleId,
            color: { lightThemeHex: '#1d4ed8', darkThemeHex: '#60a5fa' },
        }),
    });

    const results = {};

    if (inPersonEvent.status === 'success' && inPersonEvent.data) {
        results.eventlink = `${inPersonEvent.data.bookingUrl}?${new URLSearchParams({ date: slotDate })}`;
        results.calEventTypeId = inPersonEvent.data.id;
    } else {
        console.error('[calcom] in-person event-type creation failed:', inPersonEvent);
    }

    if (videoEvent.status === 'success' && videoEvent.data) {
        results.eventlinkVideo = `${videoEvent.data.bookingUrl}?${new URLSearchParams({ date: slotDate })}`;
        results.calEventTypeIdVideo = videoEvent.data.id;
    } else {
        console.error('[calcom] video event-type creation failed:', videoEvent);
    }

    if (!results.eventlink || !results.eventlinkVideo) {
        return {
            success: false,
            message: `Failed to create ${!results.eventlink ? 'in-person' : 'video'} event type`,
        };
    }

    return {
        success: true,
        eventlink: results.eventlink || null,
        eventlinkVideo: results.eventlinkVideo || null,
        calEventTypeId: results.calEventTypeId || null,
        calEventTypeIdVideo: results.calEventTypeIdVideo || null,
        calScheduleId: scheduleId,
    };
}

// Removes an apartment's Cal.com event types and schedule. Returns the list of
// deletions Cal.com refused, so the caller can decide whether that matters.
export async function deleteCalEvents({ calEventTypeId, calEventTypeIdVideo, calScheduleId }) {
    const errors = [];

    const targets = [
        { id: calEventTypeId, path: `/event-types/${calEventTypeId}`, version: '2024-06-14', type: 'event-type' },
        { id: calEventTypeIdVideo, path: `/event-types/${calEventTypeIdVideo}`, version: '2024-06-14', type: 'event-type-video' },
        { id: calScheduleId, path: `/schedules/${calScheduleId}`, version: '2024-06-11', type: 'schedule' },
    ];

    for (const target of targets) {
        if (!target.id) continue;
        const result = await calDelete(target.path, target.version);
        if (result.status !== 'success') errors.push({ type: target.type });
    }

    return { success: errors.length === 0, errors };
}
