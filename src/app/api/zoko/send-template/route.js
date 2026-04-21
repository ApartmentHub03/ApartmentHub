import { NextResponse } from 'next/server';

const ZOKO_API_URL = 'https://chat.zoko.io/v2/message';

// Known templates and their expected variable counts (for basic validation).
// All three templates in ApartmentHub's Zoko account are "buttonTemplate" type
// — i.e. they have a button with a dynamic URL as the last variable.
const TEMPLATES = {
    co_tenant_invite: { language: 'en', variableCount: 3, type: 'buttonTemplate' },
    guarantor_invite: { language: 'en', variableCount: 3, type: 'buttonTemplate' },
    you_can_now_start_applying_to_apartments: { language: 'en', variableCount: 2, type: 'buttonTemplate' },
};

// Zoko expects recipients as digits only with country code, no leading "+".
function normalizeRecipient(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

export async function POST(request) {
    const apiKey = process.env.ZOKO_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { success: false, message: 'ZOKO_API_KEY not configured' },
            { status: 500 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, message: 'Invalid JSON body' },
            { status: 400 }
        );
    }

    const { templateId, recipient, templateArgs } = body || {};

    if (!templateId || !TEMPLATES[templateId]) {
        return NextResponse.json(
            { success: false, message: `Unknown templateId: ${templateId}` },
            { status: 400 }
        );
    }

    const normalized = normalizeRecipient(recipient);
    if (!normalized || normalized.length < 10) {
        return NextResponse.json(
            { success: false, message: 'Invalid recipient phone number' },
            { status: 400 }
        );
    }

    const template = TEMPLATES[templateId];
    const args = Array.isArray(templateArgs) ? templateArgs.map(v => String(v ?? '')) : [];
    if (args.length !== template.variableCount) {
        return NextResponse.json(
            {
                success: false,
                message: `Template ${templateId} expects ${template.variableCount} args, got ${args.length}`,
            },
            { status: 400 }
        );
    }

    const payload = {
        channel: 'whatsapp',
        recipient: normalized,
        type: template.type,
        templateId,
        templateLanguage: template.language,
        templateArgs: args,
    };

    try {
        const res = await fetch(ZOKO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }

        if (!res.ok) {
            console.error('[zoko/send-template] Zoko API error:', res.status, data);
            return NextResponse.json(
                { success: false, status: res.status, message: 'Zoko API returned an error', details: data },
                { status: 502 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[zoko/send-template] Network error:', err);
        return NextResponse.json(
            { success: false, message: err.message || 'Network error calling Zoko API' },
            { status: 500 }
        );
    }
}
