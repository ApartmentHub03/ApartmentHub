import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

const ZOKO_API_BASE = 'https://chat.zoko.io/v2';
const ZOKO_MESSAGE_URL = `${ZOKO_API_BASE}/message`;

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str.toLowerCase().trim());
    return crypto.subtle.digest('SHA-256', data).then(buf => {
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    });
}

function zokoHeaders(apiKey) {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': apiKey,
    };
}

async function findZokoCustomerId(apiKey, phone) {
    try {
        const res = await fetch(`${ZOKO_API_BASE}/customer?phone=${encodeURIComponent(phone)}`, {
            method: 'GET',
            headers: zokoHeaders(apiKey),
        });
        if (res.ok) {
            const text = await res.text();
            if (text) {
                try {
                    const data = JSON.parse(text);
                    if (Array.isArray(data) && data.length > 0 && data[0].id) return data[0].id;
                    if (data && data.id) return data.id;
                } catch {}
            }
        }
    } catch (err) {
        console.error('[meta-lead] Zoko find customer error:', err);
    }
    return null;
}

async function addZokoTags(apiKey, customerId, tags) {
    if (!customerId || !tags || tags.length === 0) return;
    try {
        await fetch(`${ZOKO_API_BASE}/customer/${customerId}/tags`, {
            method: 'POST',
            headers: zokoHeaders(apiKey),
            body: JSON.stringify({ tags }),
        });
    } catch (err) {
        console.error('[meta-lead] Zoko add tags error:', err);
    }
}

async function setZokoProperties(apiKey, customerId, properties) {
    if (!customerId) return;
    const entries = Object.entries(properties).map(([key, value]) => ({ key, value }));
    try {
        await fetch(`${ZOKO_API_BASE}/customer/${customerId}/properties`, {
            method: 'POST',
            headers: zokoHeaders(apiKey),
            body: JSON.stringify(entries),
        });
    } catch (err) {
        console.error('[meta-lead] Zoko set properties error:', err);
    }
}

async function sendZokoTemplateMessage(apiKey, phone, templateId, templateType, templateLanguage, templateArgs) {
    try {
        const res = await fetch(ZOKO_MESSAGE_URL, {
            method: 'POST',
            headers: zokoHeaders(apiKey),
            body: JSON.stringify({
                channel: 'whatsapp',
                recipient: phone,
                type: templateType || 'buttonTemplate',
                templateId,
                templateLanguage: templateLanguage || 'nl',
                templateArgs,
            }),
        });
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }

        if (!res.ok) {
            console.error('[meta-lead] Zoko send message error:', res.status, data);
            return { success: false, status: res.status, details: data };
        }
        return { success: true, data };
    } catch (err) {
        console.error('[meta-lead] Zoko send message error:', err);
        return { success: false, error: err.message };
    }
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { fullName, phone, email, bedrooms, budget, language, consent, source, sourceUrl, submittedAt, eventId, tracking, tags } = body;

    if (!fullName || !phone || !consent) {
        return NextResponse.json({ success: false, message: 'Missing required fields: fullName, phone, consent' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
        return NextResponse.json({ success: false, message: 'Invalid phone number' }, { status: 400 });
    }

    const results = { webhook: null, supabase: null, zoko: null, capi: null };

    const webhookUrl = process.env.LEAD_WEBHOOK_URL;
    if (webhookUrl) {
        try {
            const webhookRes = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!webhookRes.ok) {
                console.error('[meta-lead] Webhook error:', webhookRes.status);
                results.webhook = { success: false, status: webhookRes.status };
            } else {
                results.webhook = { success: true };
            }
        } catch (err) {
            console.error('[meta-lead] Webhook error:', err);
            results.webhook = { success: false, error: err.message };
        }
    }

    const supabase = getSupabaseServer();
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('meta_leads')
                .upsert({
                    phone: normalizedPhone,
                    full_name: fullName,
                    email: email || null,
                    bedrooms,
                    budget,
                    language: language || 'nl',
                    source: source || 'meta_ads',
                    source_url: sourceUrl,
                    consent: true,
                    event_id: eventId,
                    tracking_fbp: tracking?.fbp || null,
                    tracking_fbc: tracking?.fbc || null,
                    tracking_fbclid: tracking?.fbclid || null,
                    utm_source: tracking?.utm?.utm_source || null,
                    utm_medium: tracking?.utm?.utm_medium || null,
                    utm_campaign: tracking?.utm?.utm_campaign || null,
                    utm_content: tracking?.utm?.utm_content || null,
                    utm_term: tracking?.utm?.utm_term || null,
                    referrer: tracking?.referrer || null,
                    tags: tags || [],
                    submitted_at: submittedAt,
                }, { onConflict: 'phone' });

            if (error) {
                console.error('[meta-lead] Supabase insert error:', error);
                results.supabase = { success: false, error: error.message };
            } else {
                results.supabase = { success: true };
            }
        } catch (err) {
            console.error('[meta-lead] Supabase error:', err);
            results.supabase = { success: false, error: err.message };
        }
    }

    const zokoApiKey = process.env.ZOKO_API_KEY;
    if (zokoApiKey) {
        try {
            let customerId = null;

            // Step 1: Try to find existing contact by phone
            customerId = await findZokoCustomerId(zokoApiKey, normalizedPhone);

            // For existing contacts: update tags and properties first
            if (customerId) {
                if (tags && tags.length > 0) {
                    await addZokoTags(zokoApiKey, customerId, tags);
                }
                await setZokoProperties(zokoApiKey, customerId, {
                    name: fullName || '',
                    email: email || '',
                    bedrooms: bedrooms || '',
                    budget: budget || '',
                    language: language || 'nl',
                    source: source || 'meta_ads',
                });
            }

            // Step 2: Send template message (also auto-creates contact for new numbers)
            const templateId = language === 'en'
                ? process.env.ZOKO_META_WELCOME_TEMPLATE_EN
                : process.env.ZOKO_META_WELCOME_TEMPLATE_NL;
            const templateType = process.env.ZOKO_META_WELCOME_TEMPLATE_TYPE || 'buttonTemplate';

            if (templateId) {
                const msgResult = await sendZokoTemplateMessage(
                    zokoApiKey,
                    normalizedPhone,
                    templateId,
                    templateType,
                    language === 'en' ? 'en' : 'nl',
                    [fullName, sourceUrl || ''],
                );
                results.zoko = msgResult;

                // For new contacts: message creates them, now add tags
                if (msgResult.success && !customerId) {
                    const newCustomerId = msgResult.data?.customerId || await findZokoCustomerId(zokoApiKey, normalizedPhone);
                    if (newCustomerId) {
                        if (tags && tags.length > 0) {
                            await addZokoTags(zokoApiKey, newCustomerId, tags);
                        }
                        await setZokoProperties(zokoApiKey, newCustomerId, {
                            name: fullName || '',
                            email: email || '',
                            bedrooms: bedrooms || '',
                            budget: budget || '',
                            language: language || 'nl',
                            source: source || 'meta_ads',
                        });
                    }
                }
            } else {
                // No template configured — we still tried to update existing contacts above
                results.zoko = customerId
                    ? { success: true, note: 'Existing contact updated with tags, no welcome template configured' }
                    : { success: true, note: 'No welcome template configured — set ZOKO_META_WELCOME_TEMPLATE_NL and ZOKO_META_WELCOME_TEMPLATE_EN in .env.local. New contacts cannot be created without a template.' };
            }
        } catch (err) {
            console.error('[meta-lead] Zoko error:', err);
            results.zoko = { success: false, error: err.message };
        }
    }

    const metaPixelId = process.env.META_PIXEL_ID;
    const metaCapiToken = process.env.META_CAPI_ACCESS_TOKEN;
    if (metaPixelId && metaCapiToken) {
        try {
            const userData = {};
            userData.ph = await sha256(normalizedPhone);
            if (email) userData.em = await sha256(email);
            if (tracking?.fbp) userData.fbp = tracking.fbp;
            if (tracking?.fbc) userData.fbc = tracking.fbc;

            const capiPayload = {
                data: [{
                    event_name: 'Lead',
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: eventId,
                    event_source_url: sourceUrl,
                    action_source: 'website',
                    user_data: userData,
                    custom_data: { content_name: 'meta_leadform', language: language || 'nl' },
                }],
            };

            const capiRes = await fetch(
                `https://graph.facebook.com/v19.0/${metaPixelId}/events`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...capiPayload, access_token: metaCapiToken }),
                }
            );

            if (!capiRes.ok) {
                const errText = await capiRes.text();
                console.error('[meta-lead] CAPI error:', capiRes.status, errText);
                results.capi = { success: false, status: capiRes.status };
            } else {
                results.capi = { success: true };
            }
        } catch (err) {
            console.error('[meta-lead] CAPI error:', err);
            results.capi = { success: false, error: err.message };
        }
    }

    return NextResponse.json({ success: true, results });
}