import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { sha256, normalizePhone, buildUserData, eventId, sendCapiEvent, findZokoCustomerId, addZokoTags } from '@/lib/meta-capi';

/* ------------------------------------------------------------------ */
/* HMAC verification                                                  */
/* ------------------------------------------------------------------ */
function verifyCalcomHmac(reqBody, signature) {
    const secret = process.env.CALCOM_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    try {
        const computed = createHmac('sha256', secret).update(reqBody).digest('hex');
        console.log('[webhook/calcom] Computed HMAC:', computed);
        console.log('[webhook/calcom] Received HMAC:', signature);
        return computed === signature;
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/* Extract phone from Cal.com responses / attendees                   */
/* ------------------------------------------------------------------ */
function extractPhone(payload) {
    const responses = payload.responses || {};
    const attendees = payload.attendees || [];

    // Try custom fields first
    for (const key of ['whatsapp', 'whatsappNumber', 'whatsapp_number', 'phone', 'telefoon', 'phoneNumber', 'attendeePhoneNumber']) {
        if (responses[key]?.value) return normalizePhone(responses[key].value);
    }

    // Fallback: attendee email — return normalized phone placeholder or null
    if (attendees.length > 0 && attendees[0].email) {
        return attendees[0].email.toLowerCase().trim();
    }

    return null;
}

/* ------------------------------------------------------------------ */
/* Look up lead by phone or email fallback                            */
/* ------------------------------------------------------------------ */
async function findLead(supabase, phoneOrEmail) {
    if (!phoneOrEmail) return null;

    // Try exact phone match first
    if (/^\d{7,15}$/.test(phoneOrEmail)) {
        const { data } = await supabase.from('meta_leads').select('*').eq('phone', phoneOrEmail).maybeSingle();
        if (data) return data;
    }

    // Fallback to email
    const { data } = await supabase.from('meta_leads').select('*').eq('email', phoneOrEmail).maybeSingle();
    return data;
}

/* ------------------------------------------------------------------ */
/* POST handler                                                       */
/* ------------------------------------------------------------------ */
export async function POST(request) {
    // Read raw body text first for HMAC verification (must use raw string, not JSON.stringify)
    let rawBody, body;
    try {
        rawBody = await request.text();
        if (!rawBody) throw new Error('Empty body');
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[webhook/calcom] Body preview:', rawBody.slice(0, 500));
    const headerEntries = Object.fromEntries(request.headers);
    console.log('[webhook/calcom] Headers:', JSON.stringify(headerEntries));

    // Verify HMAC using RAW body text (skip if CALCOM_WEBHOOK_SECRET is not set)
    const signature = request.headers.get('calcom-webhook-signature')
        || request.headers.get('x-calcom-signature')
        || request.headers.get('x-cal-signature-256');
    const calcomSecret = process.env.CALCOM_WEBHOOK_SECRET;
    if (calcomSecret) {
        const verified = await verifyCalcomHmac(rawBody, signature);
        console.log('[webhook/calcom] HMAC verified:', verified, 'signature:', signature ? signature.slice(0, 20) + '...' : 'NONE');
        if (!verified) {
            return NextResponse.json({ success: false, message: 'Invalid HMAC signature' }, { status: 401 });
        }
    } else {
        console.log('[webhook/calcom] HMAC skipped — CALCOM_WEBHOOK_SECRET not set');
    }

    const triggerEvent = body.triggerEvent;
    console.log('[webhook/calcom] Trigger event:', triggerEvent, 'has payload:', !!body.payload);
    if (!triggerEvent || !body.payload) {
        return NextResponse.json({ success: false, message: 'Missing triggerEvent or payload' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    const zokoApiKey = process.env.ZOKO_API_KEY;
    const results = {};

    try {
        switch (triggerEvent) {
            case 'BOOKING_CREATED': {
                console.log('[webhook/calcom] payload.responses:', JSON.stringify(body.payload.responses));
                console.log('[webhook/calcom] payload.attendees:', JSON.stringify(body.payload.attendees?.map(a => a.email)));
                const phoneOrEmail = extractPhone(body.payload);
                console.log('[webhook/calcom] Extracted phoneOrEmail:', phoneOrEmail);
                if (!phoneOrEmail) {
                    return NextResponse.json({ success: false, message: 'No phone or email found' }, { status: 400 });
                }

                const lead = await findLead(supabase, phoneOrEmail);
                console.log('[webhook/calcom] Lead lookup:', lead ? `id=${lead.id} phone=${lead.phone} stage=${lead.stage}` : 'NOT FOUND');
                if (!lead) {
                    return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
                }

                const normalizedPhone = normalizePhone(lead.phone);
                const uid = body.payload.uid;
                const bookingUrl = body.payload.url || body.payload.manageLink || null;
                const eid = await eventId(normalizedPhone, 'Schedule');
                const userData = await buildUserData(lead);

                // CAPI Schedule
                const capiRes = await sendCapiEvent({
                    eventName: 'Schedule',
                    eventId: eid,
                    actionSource: 'system_generated',
                    userData,
                    customData: { booking_uid: uid, booking_url: bookingUrl },
                });
                results.capi = capiRes;

                // Zoko viewing_planned tag
                if (zokoApiKey) {
                    const customerId = await findZokoCustomerId(zokoApiKey, normalizedPhone);
                    if (customerId) {
                        await addZokoTags(zokoApiKey, customerId, ['viewing_planned']);
                        results.zoko = { success: true, customerId };
                    }
                }

                // Update meta_leads
                const updates = {
                    stage: 'scheduled',
                    cal_booking_uid: uid,
                    cal_booking_url: bookingUrl,
                    scheduled_at: new Date().toISOString(),
                };
                const { error } = await supabase.from('meta_leads').update(updates).eq('phone', normalizedPhone);
                if (error) {
                    console.error('[webhook/calcom] Update error:', error);
                    results.db = { success: false, error: error.message };
                } else {
                    console.log('[webhook/calcom] Updated lead', normalizedPhone, 'to stage=scheduled');
                    results.db = { success: true };
                }

                return NextResponse.json({ success: true, results });
            }

            case 'BOOKING_CANCELLED': {
                const phoneOrEmail = extractPhone(body.payload);
                if (!phoneOrEmail) {
                    console.log('[webhook/calcom] CANCELLED: no phone extracted, skipping');
                    return NextResponse.json({ success: true, message: 'No phone — skipping' });
                }

                const lead = await findLead(supabase, phoneOrEmail);
                if (!lead) {
                    console.log('[webhook/calcom] CANCELLED: lead not found for', phoneOrEmail);
                    return NextResponse.json({ success: true, message: 'Lead not found — skipping' });
                }

                const normalizedPhone = normalizePhone(lead.phone);
                console.log('[webhook/calcom] CANCELLED: lead', normalizedPhone, 'current stage:', lead.stage);
                if (lead.stage === 'scheduled') {
                    const { error } = await supabase.from('meta_leads').update({
                        stage: 'lead',
                        cal_booking_uid: null,
                        cal_booking_url: null,
                        scheduled_at: null,
                    }).eq('phone', normalizedPhone);
                    if (error) {
                        console.error('[webhook/calcom] CANCELLED update error:', error);
                    } else {
                        console.log('[webhook/calcom] CANCELLED: reset', normalizedPhone, 'to stage=lead');
                    }
                } else {
                    console.log('[webhook/calcom] CANCELLED: stage is', lead.stage, '- no reset needed');
                }

                return NextResponse.json({ success: true, message: 'Booking cancelled, stage reset if applicable' });
            }

            case 'BOOKING_RESCHEDULED': {
                const phoneOrEmail = extractPhone(body.payload);
                if (!phoneOrEmail) {
                    console.log('[webhook/calcom] RESCHEDULED: no phone extracted, skipping');
                    return NextResponse.json({ success: true, message: 'No phone — skipping' });
                }

                const lead = await findLead(supabase, phoneOrEmail);
                if (!lead) {
                    console.log('[webhook/calcom] RESCHEDULED: lead not found for', phoneOrEmail);
                    return NextResponse.json({ success: true, message: 'Lead not found — skipping' });
                }

                const normalizedPhone = normalizePhone(lead.phone);
                const uid = body.payload.uid;
                const bookingUrl = body.payload.url || body.payload.manageLink || null;
                console.log('[webhook/calcom] RESCHEDULED: updating', normalizedPhone, 'uid:', uid);

                const { error } = await supabase.from('meta_leads').update({
                    cal_booking_uid: uid,
                    cal_booking_url: bookingUrl,
                    scheduled_at: new Date().toISOString(),
                }).eq('phone', normalizedPhone);
                if (error) {
                    console.error('[webhook/calcom] RESCHEDULED update error:', error);
                } else {
                    console.log('[webhook/calcom] RESCHEDULED: done for', normalizedPhone);
                }

                return NextResponse.json({ success: true, message: 'Booking rescheduled' });
            }

            default:
                console.log('[webhook/calcom] Unhandled trigger:', triggerEvent);
                return NextResponse.json({ success: true, message: `Unhandled trigger: ${triggerEvent}` });
        }
    } catch (err) {
        console.error('[webhook/calcom] Unhandled error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
