import { NextResponse } from 'next/server';
import { ZOKO_TEMPLATES } from '@/services/zokoTemplates';
import { rateLimit, clientIp } from '@/services/rateLimit';

const ZOKO_API_URL = 'https://chat.zoko.io/v2/message';

// Templates + expected variable counts come from the shared catalog
// (src/services/zokoTemplates.js) so the CRM UI and this sender stay in sync.
const TEMPLATES = ZOKO_TEMPLATES;

// This route is reachable WITHOUT authentication because the public /aanvraag
// flow calls it: tenants authenticate over WhatsApp OTP and never hold a
// Supabase session. So it is restricted to the invite templates that flow
// genuinely needs. Every other template — offers, deals, anything addressed to
// the wider audience — must go through /api/admin/crm/send-template, which is
// CRM-authed. Widening this list hands the internet our WhatsApp account.
const PUBLIC_TEMPLATES = new Set([
    'co_tenant_invite',
    'guarantor_invite',
    'you_can_now_start_applying_to_apartments',
]);

// A tenant invites at most a couple of co-tenants/guarantors; anything above
// this is abuse, not use.
const RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

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

    if (!PUBLIC_TEMPLATES.has(templateId)) {
        console.warn('[zoko/send-template] blocked non-public template:', templateId, 'from', clientIp(request));
        return NextResponse.json(
            { success: false, message: 'This template cannot be sent from here.' },
            { status: 403 }
        );
    }

    const limited = rateLimit(`zoko:${clientIp(request)}`, RATE_LIMIT);
    if (!limited.allowed) {
        return NextResponse.json(
            { success: false, message: 'Too many invites sent. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
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

    // Block templates whose exact Zoko templateId / type isn't confirmed yet —
    // sending to a wrong ID fails silently on Zoko's side.
    if (!template.verified || !template.zokoId) {
        return NextResponse.json(
            {
                success: false,
                message: `Template "${templateId}" is not yet connected — its exact Zoko templateId and type still need to be confirmed before it can be sent.`,
                needsZokoId: true,
            },
            { status: 422 }
        );
    }

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
        templateId: template.zokoId,
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
