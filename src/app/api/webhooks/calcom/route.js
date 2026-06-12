import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { sha256, normalizePhone, buildUserData, eventId, sendCapiEvent, findZokoCustomerId, addZokoTags } from '@/lib/meta-capi';

/* ------------------------------------------------------------------ */
/* HMAC verification                                                  */
/* ------------------------------------------------------------------ */
function verifyCalcomHmac(reqBody, signature) {
    const secret = process.env.CALCOM_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const bodyData = encoder.encode(typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody));
        const crypto = globalThis.crypto;
        const algorithm = { name: 'HMAC', hash: 'SHA-256' };
        return crypto.subtle.importKey('raw', keyData, algorithm, false, ['verify']).then(key =>
            crypto.subtle.verify(algorithm, key, hexToBytes(signature), bodyData)
        );
    } catch {
        return false;
    }
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    return bytes;
}

/* ------------------------------------------------------------------ */
/* Extract phone from Cal.com responses / attendees                   */
/* ------------------------------------------------------------------ */
function extractPhone(payload) {
    const responses = payload.responses || {};
    const attendees = payload.attendees || [];

    // Try custom fields first
    for (const key of ['whatsappNumber', 'whatsapp_number', 'phone', 'telefoon', 'phoneNumber', 'attendeePhoneNumber']) {
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
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    // Verify HMAC
    const signature = request.headers.get('calcom-webhook-signature')
        || request.headers.get('x-calcom-signature')
        || request.headers.get('x-cal-signature-256');
    const verified = await verifyCalcomHmac(body, signature);
    if (!verified) {
        return NextResponse.json({ success: false, message: 'Invalid HMAC signature' }, { status: 401 });
    }

    const triggerEvent = body.triggerEvent;
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
                const phoneOrEmail = extractPhone(body.payload);
                if (!phoneOrEmail) {
                    return NextResponse.json({ success: false, message: 'No phone or email found' }, { status: 400 });
                }

                const lead = await findLead(supabase, phoneOrEmail);
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
                    results.db = { success: true };
                }

                return NextResponse.json({ success: true, results });
            }

            case 'BOOKING_CANCELLED': {
                const phoneOrEmail = extractPhone(body.payload);
                if (!phoneOrEmail) return NextResponse.json({ success: true, message: 'No phone — skipping' });

                const lead = await findLead(supabase, phoneOrEmail);
                if (!lead) return NextResponse.json({ success: true, message: 'Lead not found — skipping' });

                // Reset stage to lead if currently scheduled
                const normalizedPhone = normalizePhone(lead.phone);
                if (lead.stage === 'scheduled') {
                    await supabase.from('meta_leads').update({
                        stage: 'lead',
                        cal_booking_uid: null,
                        cal_booking_url: null,
                        scheduled_at: null,
                    }).eq('phone', normalizedPhone);
                }

                return NextResponse.json({ success: true, message: 'Booking cancelled, stage reset if applicable' });
            }

            case 'BOOKING_RESCHEDULED': {
                const phoneOrEmail = extractPhone(body.payload);
                if (!phoneOrEmail) return NextResponse.json({ success: true, message: 'No phone — skipping' });

                const lead = await findLead(supabase, phoneOrEmail);
                if (!lead) return NextResponse.json({ success: true, message: 'Lead not found — skipping' });

                const normalizedPhone = normalizePhone(lead.phone);
                const uid = body.payload.uid;
                const bookingUrl = body.payload.url || body.payload.manageLink || null;

                await supabase.from('meta_leads').update({
                    cal_booking_uid: uid,
                    cal_booking_url: bookingUrl,
                    scheduled_at: new Date().toISOString(),
                }).eq('phone', normalizedPhone);

                return NextResponse.json({ success: true, message: 'Booking rescheduled' });
            }

            default:
                return NextResponse.json({ success: true, message: `Unhandled trigger: ${triggerEvent}` });
        }
    } catch (err) {
        console.error('[webhook/calcom] Error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
