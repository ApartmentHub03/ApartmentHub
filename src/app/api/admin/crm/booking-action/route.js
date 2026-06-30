import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { ZOKO_TEMPLATES } from '@/services/zokoTemplates';

// Drive a booking's cancel / reschedule from the CRM: move the participant
// between the apartment's viewing JSON buckets and fire the matching Zoko
// template (when its templateId is confirmed). CRM-authed.

const ZOKO_API_URL = 'https://chat.zoko.io/v2/message';

// action -> { from bucket, to bucket, zoko template key }
const ACTIONS = {
    cancel: { from: 'viewing_participants', to: 'viewing_cancellations', template: 'viewing_canceled' },
    reschedule: { from: 'viewing_participants', to: 'booking_reschedules', template: 'reschedule_viewing' },
};

function digits(p) { return String(p || '').replace(/\D/g, ''); }

async function tryFireTemplate(key, recipient, name) {
    const tpl = ZOKO_TEMPLATES[key];
    const apiKey = process.env.ZOKO_API_KEY;
    if (!tpl?.verified || !tpl?.zokoId) return { sent: false, reason: 'template_not_connected' };
    if (!apiKey) return { sent: false, reason: 'no_api_key' };
    // Most cancel/reschedule templates open with {{1}} = name; remaining vars are
    // left blank here and can be enriched once the exact templates are wired.
    const args = Array.from({ length: tpl.variableCount }, (_, i) => (i === 0 ? (name || '') : ''));
    try {
        const res = await fetch(ZOKO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', apikey: apiKey },
            body: JSON.stringify({
                channel: 'whatsapp', recipient: digits(recipient), type: tpl.type,
                templateId: tpl.zokoId, templateLanguage: tpl.language, templateArgs: args,
            }),
        });
        return { sent: res.ok, reason: res.ok ? 'sent' : `zoko_${res.status}` };
    } catch {
        return { sent: false, reason: 'network_error' };
    }
}

export async function POST(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const { action, apartmentId, phone, name } = await request.json();
        const cfg = ACTIONS[action];
        if (!cfg) return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
        if (!apartmentId || !phone) {
            return NextResponse.json({ success: false, message: 'apartmentId and phone are required' }, { status: 400 });
        }

        const supabase = serviceClient();
        const { data: apt, error } = await supabase
            .from('apartments')
            .select(`id, "Full Address", ${cfg.from}, ${cfg.to}`)
            .eq('id', apartmentId)
            .maybeSingle();
        if (error) throw error;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const fromList = Array.isArray(apt[cfg.from]) ? apt[cfg.from] : [];
        const toList = Array.isArray(apt[cfg.to]) ? apt[cfg.to] : [];
        const target = digits(phone);

        const idx = fromList.findIndex((p) => digits(p?.whatsapp_number) === target);
        const moved = idx >= 0 ? fromList[idx] : { name: name || null, whatsapp_number: phone };
        const newFrom = idx >= 0 ? fromList.filter((_, i) => i !== idx) : fromList;
        const stamp = { ...moved, cancelled_by: action === 'cancel' ? 'apartmenthub-team' : moved.cancelled_by };

        const { error: upErr } = await supabase
            .from('apartments')
            .update({ [cfg.from]: newFrom, [cfg.to]: [...toList, stamp] })
            .eq('id', apartmentId);
        if (upErr) throw upErr;

        const whatsapp = await tryFireTemplate(cfg.template, phone, moved.name || name);

        return NextResponse.json({ success: true, action, whatsapp });
    } catch (err) {
        console.error('[crm/booking-action POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
