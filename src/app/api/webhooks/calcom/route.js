import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { sha256, normalizePhone, buildUserData, eventId, sendCapiEvent, findZokoCustomerId, addZokoTags } from '@/lib/meta-capi';
import { ZOKO_TEMPLATES } from '@/services/zokoTemplates';

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

    for (const key of ['whatsapp', 'whatsappNumber', 'whatsapp_number', 'phone', 'telefoon', 'phoneNumber', 'attendeePhoneNumber']) {
        if (responses[key]?.value) return normalizePhone(responses[key].value);
    }

    if (attendees.length > 0 && attendees[0].email) {
        return attendees[0].email.toLowerCase().trim();
    }

    return null;
}

function extractName(payload) {
    const attendees = payload.attendees || [];
    if (attendees.length > 0 && attendees[0].name) {
        return attendees[0].name.trim();
    }
    const responses = payload.responses || {};
    for (const key of ['name', 'fullName', 'full_name', 'attendeeName']) {
        if (responses[key]?.value) return responses[key].value.trim();
    }
    return null;
}

/* ------------------------------------------------------------------ */
/* Resolve the apartment a Cal.com booking belongs to                 */
/* ------------------------------------------------------------------ */
// Mirrors the SQL event_url_matches() helper: case-insensitive
// substring match in either direction.
function eventUrlMatches(tenantUrl, aptEventLink) {
    if (!tenantUrl || !aptEventLink) return false;
    const t = tenantUrl.trim().toLowerCase();
    const a = aptEventLink.trim().toLowerCase();
    if (!t || !a) return false;
    return t === a || t.includes(a) || a.includes(t);
}

async function findApartmentForBooking(supabase, payload) {
    const eventTypeId = payload?.eventTypeId ?? payload?.event_type_id ?? null;
    const bookingUrl = payload?.url || payload?.manageLink || null;

    // 1. Prefer exact eventTypeId match — most reliable.
    if (eventTypeId) {
        const { data } = await supabase
            .from('apartments')
            .select('id, "Full Address"')
            .or(`cal_event_type_id.eq.${eventTypeId},cal_event_type_id_video.eq.${eventTypeId}`)
            .limit(1)
            .maybeSingle();
        if (data) return data;
    }

    // 2. Fallback: substring-match the booking URL against event_link / eventlink_video.
    if (bookingUrl) {
        const { data: apts } = await supabase
            .from('apartments')
            .select('id, "Full Address", event_link, eventlink_video')
            .not('event_link', 'is', null);
        if (apts && apts.length > 0) {
            const match = apts.find((a) =>
                eventUrlMatches(bookingUrl, a.event_link) ||
                eventUrlMatches(bookingUrl, a.eventlink_video)
            );
            if (match) return { id: match.id, 'Full Address': match['Full Address'] };
        }
    }

    return null;
}

/* ------------------------------------------------------------------ */
/* Send the "booking confirmed" WhatsApp template directly to Zoko.   */
/* The 5th arg (uploadPath) is only appended when the live Zoko       */
/* template exposes a dynamic {{5}} button URL variable. The template */
/* button is registered as https://www.apartmenthub.nl/{{5}}, so the  */
/* 5th arg is a PATH suffix (e.g. aanvraag?apartment=<id>), not a     */
/* full URL. Until Meta re-approves that edit, the catalog may         */
/* temporarily still report variableCount: 4, in which case we send a */
/* safe 4-arg body.                                                    */
/* ------------------------------------------------------------------ */
async function sendBookingConfirmedWhatsApp(recipient, name, apartmentAddress, viewingDate, viewingTime, uploadPath) {
    const tpl = ZOKO_TEMPLATES.booking_confirmed_sales_force;
    const apiKey = process.env.ZOKO_API_KEY;
    if (!tpl?.verified || !tpl?.zokoId) return { sent: false, reason: 'template_not_verified' };
    if (!apiKey) return { sent: false, reason: 'no_api_key' };
    if (!recipient) return { sent: false, reason: 'no_recipient' };

    const args = [name || '', apartmentAddress || '', viewingDate || '', viewingTime || ''];
    if (tpl.variableCount >= 5) args.push(uploadPath || '');
    try {
        const res = await fetch('https://chat.zoko.io/v2/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', apikey: apiKey },
            body: JSON.stringify({
                channel: 'whatsapp',
                recipient: String(recipient).replace(/\D/g, ''),
                type: tpl.type,
                templateId: tpl.zokoId,
                templateLanguage: tpl.language,
                templateArgs: args,
            }),
        });
        return { sent: res.ok, status: res.status };
    } catch (err) {
        console.error('[webhook/calcom] Zoko send network error:', err);
        return { sent: false, reason: 'network_error' };
    }
}

async function findLead(supabase, phoneOrEmail, name) {
    // 1. Try exact phone match
    if (phoneOrEmail && /^\d{7,15}$/.test(phoneOrEmail)) {
        const { data } = await supabase.from('meta_leads').select('*').eq('phone', phoneOrEmail).maybeSingle();
        if (data) return data;
    }

    // 2. Fallback to email
    if (phoneOrEmail) {
        const { data } = await supabase.from('meta_leads').select('*').eq('email', phoneOrEmail).maybeSingle();
        if (data) return data;
    }

    // 3. Fallback to full name (stripped, case-insensitive)
    if (name) {
        const stripped = name.replace(/\s+/g, '').toLowerCase();
        const { data } = await supabase.from('meta_leads').select('*').ilike('full_name', `%${name}%`).limit(10);
        if (data && data.length > 0) {
            const match = data.find(lead => lead.full_name && lead.full_name.replace(/\s+/g, '').toLowerCase() === stripped);
            if (match) return match;
        }
    }

    return null;
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
                const name = extractName(body.payload);
                console.log('[webhook/calcom] Extracted phoneOrEmail:', phoneOrEmail, 'name:', name);
                if (!phoneOrEmail && !name) {
                    return NextResponse.json({ success: false, message: 'No phone, email, or name found' }, { status: 400 });
                }

                const lead = await findLead(supabase, phoneOrEmail, name);
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

                // WhatsApp: "booking confirmed" — fires right after the
                // candidate books a viewing via Cal.com. Sends the
                // booking_confirmed_sales_force template with a dynamic
                // upload-documents button URL ({{5}}) that carries the booked
                // apartment id so /aanvraag pre-selects it after login. The
                // template's button URL is registered as
                // https://www.apartmenthub.nl/{{5}}, so {{5}} is a PATH suffix
                // (e.g. aanvraag?apartment=<id>) — NOT a full URL. Only sent
                // for valid phone numbers (not email fallbacks) and never
                // blocks the DB write or the 200 response.
                if (normalizedPhone && /^\d{7,15}$/.test(normalizedPhone)) {
                    const apartment = await findApartmentForBooking(supabase, body.payload);
                    const uploadPath = apartment
                        ? `aanvraag?apartment=${apartment.id}`
                        : 'aanvraag';
                    const displayName = name || lead.full_name || '';
                    const apartmentAddress = apartment?.['Full Address'] || '';
                    const startMs = body.payload.startTime ? new Date(body.payload.startTime).getTime() : Date.now();
                    const viewingDate = new Date(startMs).toLocaleDateString('nl-NL');
                    const viewingTime = new Date(startMs).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                    try {
                        results.whatsapp = await sendBookingConfirmedWhatsApp(normalizedPhone, displayName, apartmentAddress, viewingDate, viewingTime, uploadPath);
                        console.log('[webhook/calcom] WhatsApp booking-confirmed:', results.whatsapp);
                    } catch (err) {
                        console.error('[webhook/calcom] WhatsApp send error:', err);
                        results.whatsapp = { sent: false, reason: 'exception' };
                    }
                } else {
                    console.log('[webhook/calcom] Skipping WhatsApp: no valid phone (got email or none)');
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
                const name = extractName(body.payload);
                if (!phoneOrEmail && !name) {
                    console.log('[webhook/calcom] CANCELLED: no phone or name extracted, skipping');
                    return NextResponse.json({ success: true, message: 'No phone or name — skipping' });
                }

                const lead = await findLead(supabase, phoneOrEmail, name);
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
                const name = extractName(body.payload);
                if (!phoneOrEmail && !name) {
                    console.log('[webhook/calcom] RESCHEDULED: no phone or name extracted, skipping');
                    return NextResponse.json({ success: true, message: 'No phone or name — skipping' });
                }

                const lead = await findLead(supabase, phoneOrEmail, name);
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
