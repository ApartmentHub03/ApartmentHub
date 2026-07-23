import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { ZOKO_TEMPLATES } from '@/services/zokoTemplates';

// Direct Zoko broadcast: selects recipients from candidate_segment_members
// matching the chosen Zoko segment IDs and sends the pdf_apartment_utility
// template to each recipient via POST /v2/message.
//
// Hybrid execution: the first SYNC_BATCH_SIZE recipients are sent
// synchronously (so the user gets immediate feedback), the rest fire as a
// background promise that logs progress to the console.

const ZOKO_API_URL = 'https://chat.zoko.io/v2/message';
const BROCHURE_BUCKET = 'Apartment Doc';
const BROCHURE_TTL = 86400; // 24 hours
const SYNC_BATCH_SIZE = 50;
const SEND_DELAY_MS = 300; // delay between individual /v2/message calls

const QUESTIONS_LINK = 'https://apartmenthub.nl/contact/';
const UNSUBSCRIBE_LINK = 'https://apartmenthub.nl/contact/';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

// Build the 11 template variables for pdf_apartment_utility.
// {{1}} Brochure PDF URL, {{2}} Candidate name, {{3}} Address,
// {{4}} Price, {{5}} Bedrooms, {{6}} Square meters, {{7}} Additional note,
// {{8}} In-person viewing link, {{9}} Facetime viewing link,
// {{10}} "I have questions" link, {{11}} Unsubscribe link
function buildTemplateArgs(apt, recipient, brochureUrl) {
    return [
        brochureUrl || '',
        recipient.name || 'there',
        apt['Full Address'] || '',
        apt.rental_price != null ? String(apt.rental_price) : '',
        apt.bedrooms != null ? String(apt.bedrooms) : '',
        apt.square_meters != null ? String(apt.square_meters) : '',
        apt.additional_notes || '',
        apt.event_link || '',
        apt.eventlink_video || '',
        QUESTIONS_LINK,
        UNSUBSCRIBE_LINK,
    ];
}

async function sendOneZokoMessage(apiKey, recipient, templateArgs) {
    const template = ZOKO_TEMPLATES.pdf_apartment_utility;
    const normalizedRecipient = normalizePhone(recipient.phone);
    const payload = {
        channel: 'whatsapp',
        recipient: normalizedRecipient,
        type: template.type,
        templateId: template.zokoId,
        templateLanguage: template.language,
        templateArgs,
    };

    console.log('[crm/broadcast] sending to Zoko:', JSON.stringify({ recipient: normalizedRecipient, templateId: payload.templateId, argCount: templateArgs.length, args: templateArgs }));

    try {
        const res = await fetch(ZOKO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', apikey: apiKey },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        if (!res.ok) {
            console.error('[crm/broadcast] Zoko send failed for', recipient.phone, res.status, text);
            return { phone: recipient.phone, ok: false, status: res.status, body: text };
        }
        console.log('[crm/broadcast] Zoko send OK for', recipient.phone, text.slice(0, 200));
        return { phone: recipient.phone, ok: true, body: text };
    } catch (err) {
        console.error('[crm/broadcast] Zoko network error for', recipient.phone, err);
        return { phone: recipient.phone, ok: false, error: String(err) };
    }
}

async function sendBatch(apiKey, recipients, apt, brochureUrl, fromIndex) {
    let sent = 0;
    let failedCount = 0;
    for (let i = fromIndex; i < recipients.length; i++) {
        if (i > fromIndex) await sleep(SEND_DELAY_MS);
        const recipient = recipients[i];
        const args = buildTemplateArgs(apt, recipient, brochureUrl);
        const result = await sendOneZokoMessage(apiKey, recipient, args);
        if (result.ok) sent++;
        else failedCount++;
    }
    console.log(`[crm/broadcast] background batch complete: sent=${sent}, failed=${failedCount}`);
    return { sent, failed: failedCount };
}

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const { segmentIds, testPhone } = body || {};

        const testPhoneNormalized = testPhone ? String(testPhone).replace(/\D/g, '') : '';
        const hasTestPhone = testPhoneNormalized.length >= 7;

        if (!hasTestPhone && (!Array.isArray(segmentIds) || segmentIds.length === 0)) {
            return NextResponse.json({ success: false, message: 'Select at least one segment or enter a test phone number' }, { status: 400 });
        }

        const apiKey = process.env.ZOKO_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, message: 'ZOKO_API_KEY not configured' }, { status: 500 });
        }

        const supabase = serviceClient();

        const { data: apt, error: aptErr } = await supabase.from('apartments').select('*').eq('id', id).maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        // Generate a signed URL for the brochure PDF (24h TTL).
        let brochureUrl = null;
        const brochure = apt.booking_details?.brochure_pdf;
        if (brochure?.path) {
            try {
                const { data: signed } = await supabase.storage
                    .from(BROCHURE_BUCKET).createSignedUrl(brochure.path, BROCHURE_TTL);
                if (signed?.signedUrl) brochureUrl = signed.signedUrl;
            } catch {
                // Best-effort — send proceeds without a brochure URL.
            }
        }

        let recipients;

        if (hasTestPhone) {
            recipients = [{
                phone: testPhoneNormalized,
                name: 'Test recipient',
                email: null,
                zoko_customer_id: null,
            }];
        } else {
            // segmentIds are Zoko segment UUIDs — resolve to our DB segment UUIDs.
            const { data: segRows, error: segErr } = await supabase
                .from('candidate_segments')
                .select('id')
                .in('zoko_segment_id', segmentIds);
            if (segErr) throw segErr;

            const dbSegmentIds = (segRows || []).map((s) => s.id);
            if (dbSegmentIds.length === 0) {
                return NextResponse.json({ success: false, message: 'No matching segments found' }, { status: 400 });
            }

            const { data: members, error: memErr } = await supabase
                .from('candidate_segment_members')
                .select('phone, name, email, zoko_customer_id')
                .in('segment_id', dbSegmentIds)
                .eq('is_archived', false);
            if (memErr) throw memErr;

            const deduped = new Map();
            for (const m of members || []) {
                const phone = normalizePhone(m.phone);
                if (!phone || phone.length < 7) continue;
                if (!deduped.has(phone)) {
                    deduped.set(phone, {
                        phone,
                        name: m.name,
                        email: m.email,
                        zoko_customer_id: m.zoko_customer_id,
                    });
                }
            }
            recipients = Array.from(deduped.values());
        }

        if (recipients.length === 0) {
            return NextResponse.json({ success: false, message: 'No recipients match the selected segments' }, { status: 400 });
        }

        // Hybrid: send the first batch synchronously, rest in background.
        const syncEnd = Math.min(SYNC_BATCH_SIZE, recipients.length);
        const syncResults = await sendBatch(apiKey, recipients.slice(0, syncEnd), apt, brochureUrl, 0);
        let syncSent = syncResults.sent;
        let syncFailed = syncResults.failed;

        if (recipients.length > syncEnd) {
            // Fire-and-forget the remaining recipients.
            sendBatch(apiKey, recipients, apt, brochureUrl, syncEnd).catch((err) => {
                console.error('[crm/broadcast] background batch crashed:', err);
            });
        }

        const totalRecipients = recipients.length;
        const backgroundCount = Math.max(0, totalRecipients - syncEnd);

        return NextResponse.json({
            success: true,
            recipientCount: totalRecipients,
            sentSync: syncSent,
            failedSync: syncFailed,
            background: backgroundCount,
            message: backgroundCount > 0
                ? `Broadcast started — ${syncSent} sent, ${backgroundCount} continuing in background`
                : `Broadcast complete — ${syncSent} sent, ${syncFailed} failed`,
        });
    } catch (err) {
        return failed('crm/broadcast POST', err, 'Failed to broadcast');
    }
}