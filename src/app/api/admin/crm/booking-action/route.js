import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { ZOKO_TEMPLATES } from '@/services/zokoTemplates';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Drive a booking's cancel / reschedule from the CRM: move the participant
// between the apartment's viewing JSON buckets, fire the matching Zoko
// template (when its templateId is confirmed), AND fire an n8n webhook so
// Zoko Flow can branch (e.g. "Really cancel or FaceTime?") and notify the
// remaining scheduled viewers. CRM-authed.

const ZOKO_API_URL = 'https://chat.zoko.io/v2/message';

// n8n webhooks for downstream branching + viewer notification.
// Fire-and-forget: failures are logged but don't block the response.
const N8N_CANCEL_WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/agent-cancel-notification';
const N8N_RESCHEDULE_WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/agent-reschedule-notification';

// action -> { from bucket, to bucket, zoko template key, n8n webhook url }
const ACTIONS = {
    cancel: { from: 'viewing_participants', to: 'viewing_cancellations', template: 'viewing_canceled', webhookUrl: N8N_CANCEL_WEBHOOK_URL },
    reschedule: { from: 'viewing_participants', to: 'booking_reschedules', template: 'reschedule_viewing', webhookUrl: N8N_RESCHEDULE_WEBHOOK_URL },
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

// Fire-and-forget n8n webhook. Failures are logged but never throw.
async function tryFireN8nWebhook(url, payload) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return { sent: res.ok, status: res.status };
    } catch (err) {
        console.error('[crm/booking-action] n8n webhook network error:', err);
        return { sent: false, status: 0, error: String(err) };
    }
}

export async function POST(request) {
    const auth = await requirePermission(request, 'candidates');
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
        if (!isUuid(apartmentId)) return invalidId();

        const supabase = serviceClient();
        // Fetch all fields needed for: the move, the Zoko send, and the n8n
        // payload (apartment address + event links + remaining participants).
        const { data: apt, error } = await supabase
            .from('apartments')
            .select(`id, "Full Address", event_link, eventlink_video, ${cfg.from}, ${cfg.to}`)
            .eq('id', apartmentId)
            .maybeSingle();
        if (error) throw error;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const fromList = Array.isArray(apt[cfg.from]) ? apt[cfg.from] : [];
        const toList = Array.isArray(apt[cfg.to]) ? apt[cfg.to] : [];
        const target = digits(phone);

        // The participant must actually be booked on this apartment. Previously
        // a non-matching phone was invented as a new participant, appended to
        // the apartment's booking JSON, and WhatsApped — so a typo messaged a
        // stranger and corrupted the record.
        const idx = fromList.findIndex((p) => digits(p?.whatsapp_number) === target);
        if (idx === -1) {
            return NextResponse.json(
                { success: false, message: 'That person is not booked on this apartment.' },
                { status: 404 }
            );
        }

        const moved = fromList[idx];
        const newFrom = fromList.filter((_, i) => i !== idx);
        const stamp = { ...moved, cancelled_by: action === 'cancel' ? 'apartmenthub-team' : moved.cancelled_by };

        const { error: upErr } = await supabase
            .from('apartments')
            .update({ [cfg.from]: newFrom, [cfg.to]: [...toList, stamp] })
            .eq('id', apartmentId);
        if (upErr) throw upErr;

        // Message the number on the booking record, never the one in the request.
        const whatsapp = await tryFireTemplate(cfg.template, moved.whatsapp_number, moved.name || name);

        // Fire n8n webhook so Zoko Flow can branch + notify remaining viewers.
        // remaining_participants = the new (post-move) viewing_participants list,
        // reduced to just {name, whatsapp_number} for n8n to loop over.
        const remainingParticipants = newFrom.map((p) => ({
            name: p?.name || '',
            whatsapp_number: p?.whatsapp_number || '',
        }));

        const n8nPayload = {
            event_type: action === 'cancel' ? 'agent_cancel' : 'agent_reschedule',
            apartment_id: apartmentId,
            apartment_address: apt['Full Address'] || '',
            cancelled_participant: action === 'cancel'
                ? { name: moved?.name || name || '', whatsapp_number: moved?.whatsapp_number || '' }
                : undefined,
            rescheduled_participant: action === 'reschedule'
                ? { name: moved?.name || name || '', whatsapp_number: moved?.whatsapp_number || '' }
                : undefined,
            remaining_participants: remainingParticipants,
            new_booking_link: action === 'reschedule' ? (apt.event_link || '') : undefined,
            new_video_booking_link: action === 'reschedule' ? (apt.eventlink_video || '') : undefined,
            timestamp: new Date().toISOString(),
        };

        const webhook = await tryFireN8nWebhook(cfg.webhookUrl, n8nPayload);

        return NextResponse.json({ success: true, action, whatsapp, webhook });
    } catch (err) {
        return failed('crm/booking-action POST', err, 'Could not update this booking');
    }
}
