import { NextResponse } from 'next/server';

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

        // Set location based on viewing type
        const locations = viewingType === 'video'
            ? [{ type: 'integration', integration: 'cal-video' }]
            : [{ type: 'address', address, public: true }];

        // Custom booking fields for WhatsApp and Viewing Type
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
                locations,
                bookingFields,
            }),
        });

        const data = await res.json();

        if (data.status === 'success' && data.data) {
            const bookingUrl = data.data.bookingUrl;

            // Append date, time, and prefilled field values to the booking URL
            const startTime = new Date(slotDatetime);
            const dateStr = startTime.toISOString().split('T')[0];
            const timeStr = startTime.toISOString().split('.')[0];

            const viewingLabel = viewingType === 'video' ? 'Video-Viewing' : 'In-Person';
            const params = new URLSearchParams({
                date: dateStr,
                slot: timeStr,
                whatsapp: whatsappNumber || '',
                'viewing-type': viewingLabel,
            });

            const eventlink = `${bookingUrl}?${params.toString()}`;

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
