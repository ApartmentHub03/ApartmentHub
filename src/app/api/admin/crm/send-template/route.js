import { NextResponse } from 'next/server';
import { ZOKO_TEMPLATES } from '@/services/zokoTemplates';
import { requirePermission } from '@/services/crmAuth';

// CRM-authed WhatsApp template sender. Gated to active team members, validates
// against the shared catalog, and refuses unverified templates (same rules as
// /api/zoko/send-template) so the CRM can send from candidate/booking rows.

const ZOKO_API_URL = 'https://chat.zoko.io/v2/message';

function normalizeRecipient(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

export async function POST(request) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    const apiKey = process.env.ZOKO_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ success: false, message: 'ZOKO_API_KEY not configured' }, { status: 500 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { templateId, recipient, templateArgs } = body || {};
    const template = ZOKO_TEMPLATES[templateId];
    if (!template) {
        return NextResponse.json({ success: false, message: `Unknown templateId: ${templateId}` }, { status: 400 });
    }
    if (!template.verified || !template.zokoId) {
        return NextResponse.json(
            { success: false, message: `Template "${templateId}" isn't connected yet — its Zoko templateId still needs confirming.`, needsZokoId: true },
            { status: 422 }
        );
    }

    const normalized = normalizeRecipient(recipient);
    if (!normalized || normalized.length < 10) {
        return NextResponse.json({ success: false, message: 'Invalid recipient phone number' }, { status: 400 });
    }

    const args = Array.isArray(templateArgs) ? templateArgs.map((v) => String(v ?? '')) : [];
    if (args.length !== template.variableCount) {
        return NextResponse.json(
            { success: false, message: `Template ${templateId} expects ${template.variableCount} args, got ${args.length}` },
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
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', apikey: apiKey },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!res.ok) {
            console.error('[crm/send-template] Zoko error:', res.status, data);
            return NextResponse.json({ success: false, status: res.status, message: 'Zoko API returned an error', details: data }, { status: 502 });
        }
        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[crm/send-template] Network error:', err);
        return NextResponse.json({ success: false, message: 'Could not reach WhatsApp. Please try again.' }, { status: 500 });
    }
}
