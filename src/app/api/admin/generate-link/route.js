import { NextResponse } from 'next/server';

export async function POST(request) {
    const { address, slotDatetime, slotLengthMinutes } = await request.json();

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

        // Create an event type on Cal.com
        const res = await fetch('https://api.cal.com/v2/event-types', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'cal-api-version': '2024-06-14',
            },
            body: JSON.stringify({
                title: address,
                slug,
                lengthInMinutes: Number(slotLengthMinutes),
                locations: [{ type: 'address', address, public: true }],
            }),
        });

        const data = await res.json();

        if (data.status === 'success' && data.data) {
            const bookingUrl = data.data.bookingUrl;

            // Append date & time to the booking URL
            const startTime = new Date(slotDatetime);
            const dateStr = startTime.toISOString().split('T')[0];
            const timeStr = startTime.toISOString().split('.')[0];
            const eventlink = `${bookingUrl}?date=${dateStr}&slot=${timeStr}`;

            return NextResponse.json({ success: true, eventlink });
        }

        return NextResponse.json({
            success: false,
            message: data.error?.message || 'Failed to create Cal.com event type',
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
