import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getSupabaseServer } from '@/lib/supabaseServer';

const ZOKO_API_BASE = 'https://chat.zoko.io/v2';
const ZOKO_MESSAGE_URL = `${ZOKO_API_BASE}/message`;

function normalizePhone(phone) {
    if (!phone) return '';
    let s = String(phone).replace(/[^\d+]/g, '');
    if (!s) return '';
    if (s.startsWith('+')) return s.slice(1);
    if (s.startsWith('00')) return s.slice(2);
    if (s.startsWith('0') && s.length >= 10) return '31' + s.slice(1);
    if (s.length >= 9 && s.length <= 10 && !s.startsWith('31')) return '31' + s;
    return s;
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

const META_LEAD_TAG_PATTERNS = [
    /^€/,
    /\d\s*Bedroom/i,
    /\d\s*slaapkamer/i,
    /^Meta Ads$/i,
    /^source_meta$/i,
];

function isMetaLeadTag(tag) {
    return META_LEAD_TAG_PATTERNS.some(p => p.test(tag));
}

function normalizeTag(tag) {
    return tag.replace(/\s*-\s*/g, '-').replace(/€\s+/g, '€').toLowerCase();
}

async function getZokoTags(apiKey, customerId) {
    if (!customerId) return [];
    try {
        const res = await fetch(`${ZOKO_API_BASE}/customer/${customerId}/tags`, {
            method: 'GET',
            headers: zokoHeaders(apiKey),
        });
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : (data?.tags ? data.tags : []);
        }
    } catch (err) {
        console.error('[meta-lead] Zoko get tags error:', err);
    }
    return [];
}

function mergeZokoTags(existingTags, newTags) {
    const newNormalized = new Set((newTags || []).map(normalizeTag));
    const preserved = (existingTags || []).filter(t =>
        !isMetaLeadTag(t) || !newNormalized.has(normalizeTag(t))
    );
    const merged = [...new Set([...preserved, ...(newTags || [])])];
    return merged;
}

async function addZokoTags(apiKey, customerId, tags) {
    if (!customerId || !tags || tags.length === 0) return;
    try {
        console.log('[meta-lead] Zoko add tags request:', customerId, JSON.stringify(tags));
        const res = await fetch(`${ZOKO_API_BASE}/customer/${customerId}/tags`, {
            method: 'PUT',
            headers: zokoHeaders(apiKey),
            body: JSON.stringify({ tags }),
        });
        const resBody = await res.text().catch(() => '');
        if (!res.ok) {
            console.error('[meta-lead] Zoko add tags error:', res.status, resBody);
        } else {
            console.log('[meta-lead] Zoko add tags response:', res.status, resBody);
        }
        // Verify what Zoko actually stored
        const verifyRes = await fetch(`${ZOKO_API_BASE}/customer/${customerId}/tags`, {
            method: 'GET',
            headers: zokoHeaders(apiKey),
        });
        if (verifyRes.ok) {
            const stored = await verifyRes.json();
            console.log('[meta-lead] Zoko tags stored:', JSON.stringify(stored));
        }
    } catch (err) {
        console.error('[meta-lead] Zoko add tags error:', err);
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

        // Check for body-level errors (Zoko may return 200 OK with error in the body)
        if (data && typeof data === 'object') {
            const bodyStr = JSON.stringify(data).toLowerCase();
            const hasError =
                data.success === false ||
                data.status === 'failed' ||
                data.status === 'error' ||
                bodyStr.includes('invalid number') ||
                bodyStr.includes('cannot be messaged') ||
                bodyStr.includes('message failed');
            if (hasError) {
                console.error('[meta-lead] Zoko send message body error:', data);
                return { success: false, status: res.status, details: data };
            }
        }

        console.log('[meta-lead] Zoko send message success:', data);
        return { success: true, data };
    } catch (err) {
        console.error('[meta-lead] Zoko send message error:', err);
        return { success: false, error: err.message };
    }
}

const POLL_MAX_WAIT_MS = 15000;
const POLL_INTERVAL_MS = 2000;

async function pollZokoMessageStatus(apiKey, messageId) {
    const startTime = Date.now();
    while (Date.now() - startTime < POLL_MAX_WAIT_MS) {
        try {
            const res = await fetch(`${ZOKO_API_BASE}/message/${encodeURIComponent(messageId)}`, {
                method: 'GET',
                headers: zokoHeaders(apiKey),
            });
            if (res.ok) {
                const data = await res.json().catch(() => null);
                if (data) {
                    const status = String(data.deliveryStatus || data.status || '').toLowerCase();
                    console.log('[meta-lead] Zoko poll status:', status, 'for message:', messageId);

                    if (status === 'sent' || status === 'delivered' || status === 'received' || status === 'read') {
                        return 'sent';
                    }
                    if (status === 'failed' || status === 'error' || status === 'undelivered' || status === 'rejected') {
                        return 'failed';
                    }
                    const bodyStr = JSON.stringify(data).toLowerCase();
                    if (bodyStr.includes('invalid number') || bodyStr.includes('cannot be messaged') || bodyStr.includes('message failed')) {
                        return 'failed';
                    }
                }
            }
        } catch (err) {
            console.error('[meta-lead] Zoko poll error:', err);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    return null;
}

async function sendCapiEvent({ normalizedPhone, email, fullName, tracking, eventId, sourceUrl, language, variant }) {
    const metaPixelId = process.env.META_PIXEL_ID;
    const metaCapiToken = process.env.META_CAPI_ACCESS_TOKEN;
    if (!metaPixelId || !metaCapiToken) {
        console.error('[meta-lead] CAPI skipped — missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN');
        return { success: false, error: 'Missing Meta config' };
    }

    try {
        const userData = {};
        userData.ph = await sha256(normalizedPhone);
        if (email) userData.em = await sha256(email);
        if (fullName) {
            const parts = fullName.trim().split(/\s+/);
            if (parts[0]) userData.fn = await sha256(parts[0]);
            if (parts.length > 1) userData.ln = await sha256(parts.slice(1).join(' '));
        }
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
                custom_data: { content_name: 'meta_leadform', language: language || 'nl', variant: variant || 'A' },
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
            return { success: false, status: capiRes.status };
        }
        console.log('[meta-lead] CAPI success');
        return { success: true };
    } catch (err) {
        console.error('[meta-lead] CAPI error:', err);
        return { success: false, error: err.message };
    }
}

async function updateTemplateStatus(supabase, phone, status, error) {
    if (!supabase) return;
    try {
        const { error: tplError } = await supabase
            .from('meta_leads')
            .update({
                welcome_template_status: status,
                welcome_template_error: error || null,
            })
            .eq('phone', phone);
        if (tplError) {
            console.error('[meta-lead] Failed to update welcome_template_status:', tplError);
        }
    } catch (err) {
        console.error('[meta-lead] Failed to update welcome_template_status:', err);
    }
}

async function processZokoDelivery({ apiKey, messageId, normalizedPhone, email, fullName, tracking, eventId, sourceUrl, language, variant, supabase }) {
    try {
        const status = await pollZokoMessageStatus(apiKey, messageId);

        if (status === 'failed') {
            console.error('[meta-lead] Bad lead — Zoko delivery failed for message:', messageId);
            await updateTemplateStatus(supabase, normalizedPhone, 'failed', 'Delivery failed (invalid number or rejected)');
            return;
        }

        if (status === null) {
            console.log('[meta-lead] Zoko delivery timeout, firing CAPI optimistically');
        } else {
            console.log('[meta-lead] Zoko delivery confirmed, firing CAPI');
        }

        await updateTemplateStatus(supabase, normalizedPhone, 'sent', null);
        await sendCapiEvent({ normalizedPhone, email, fullName, tracking, eventId, sourceUrl, language, variant });
    } catch (err) {
        console.error('[meta-lead] processZokoDelivery error:', err);
    }
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { fullName, phone, email, bedrooms, budget, language, consent, sourceUrl, submittedAt, eventId, tracking, tags, variant, fullName2, phone2, websiteUrl } = body;

    if (websiteUrl) {
        return NextResponse.json({ success: true }, { status: 200 });
    }

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
            const externalId = await sha256(normalizedPhone);

            const leadData = {
                phone: normalizedPhone,
                full_name: fullName,
                email: email || null,
                bedrooms,
                budget,
                language: language || 'nl',
                source: 'meta_ads',
                source_url: sourceUrl,
                consent: true,
                event_id: eventId,
                external_id: externalId,
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
                variant: variant || 'A',
                second_tenant_name: fullName2 || null,
                second_tenant_phone: phone2 || null,
            };

            const { data: existing } = await supabase
                .from('meta_leads')
                .select('id')
                .eq('phone', normalizedPhone)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('meta_leads')
                    .update({
                        full_name: leadData.full_name,
                        email: leadData.email,
                        bedrooms: leadData.bedrooms,
                        budget: leadData.budget,
                        language: leadData.language,
                        source: leadData.source,
                        source_url: leadData.source_url,
                        consent: leadData.consent,
                        event_id: leadData.event_id,
                        external_id: leadData.external_id,
                        tracking_fbp: leadData.tracking_fbp,
                        tracking_fbc: leadData.tracking_fbc,
                        tracking_fbclid: leadData.tracking_fbclid,
                        utm_source: leadData.utm_source,
                        utm_medium: leadData.utm_medium,
                        utm_campaign: leadData.utm_campaign,
                        utm_content: leadData.utm_content,
                        utm_term: leadData.utm_term,
                        referrer: leadData.referrer,
                        tags: leadData.tags,
                        submitted_at: leadData.submitted_at,
                        variant: leadData.variant,
                        second_tenant_name: leadData.second_tenant_name,
                        second_tenant_phone: leadData.second_tenant_phone,
                    })
                    .eq('phone', normalizedPhone);

                if (error) {
                    console.error('[meta-lead] Supabase update error:', error);
                    results.supabase = { success: false, error: error.message };
                } else {
                    results.supabase = { success: true, isDuplicate: true };
                }
            } else {
                const { error } = await supabase
                    .from('meta_leads')
                    .insert(leadData);

                if (error) {
                    console.error('[meta-lead] Supabase insert error:', error);
                    results.supabase = { success: false, error: error.message };
                } else {
                    results.supabase = { success: true, isDuplicate: false };
                }
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
            console.log('[meta-lead] Zoko tags for', normalizedPhone, ':', JSON.stringify(tags));

            // Step 1: Try to find existing contact by phone (digits only for Zoko)
            customerId = await findZokoCustomerId(zokoApiKey, normalizedPhone);

            // For existing contacts: merge tags (preserve non-meta-lead tags, replace meta-lead categories)
            if (customerId) {
                if (tags && tags.length > 0) {
                    const existingTags = await getZokoTags(zokoApiKey, customerId);
                    const mergedTags = mergeZokoTags(existingTags, tags);
                    await addZokoTags(zokoApiKey, customerId, mergedTags);
                }
            }

            // Step 2: Send template message (also auto-creates contact for new numbers)
            const templateId = process.env.ZOKO_META_WELCOME_TEMPLATE_EN || process.env.ZOKO_META_WELCOME_TEMPLATE_NL;
            const templateType = process.env.ZOKO_META_WELCOME_TEMPLATE_TYPE || 'buttonTemplate';

            if (templateId) {
                const msgResult = await sendZokoTemplateMessage(
                    zokoApiKey,
                    normalizedPhone,
                    templateId,
                    templateType,
                    'en',
                    [fullName || ''],
                );
                results.zoko = msgResult;

                if (msgResult.success && !customerId) {
                    const newCustomerId = msgResult.data?.customerId
                        || await findZokoCustomerId(zokoApiKey, normalizedPhone);
                    if (newCustomerId) {
                        if (tags && tags.length > 0) {
                            const existingTags = await getZokoTags(zokoApiKey, newCustomerId);
                            const mergedTags = mergeZokoTags(existingTags, tags);
                            await addZokoTags(zokoApiKey, newCustomerId, mergedTags);
                        }
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

    // Determine next steps based on Zoko outcome
    const zokoMessageId = results.zoko?.success && results.zoko.data?.messageId;

    if (zokoMessageId) {
        // Zoko accepted the message (202) — poll delivery status in the background
        // and only fire CAPI if the template was actually delivered (or timeout = optimistic).
        waitUntil(
            processZokoDelivery({
                apiKey: zokoApiKey,
                messageId: zokoMessageId,
                normalizedPhone,
                email,
                fullName,
                tracking,
                eventId,
                sourceUrl,
                language,
                variant,
                supabase,
            }).catch(err => {
                console.error('[meta-lead] processZokoDelivery unhandled error:', err);
            })
        );
    } else if (results.zoko && !results.zoko.success) {
        // Zoko failed synchronously (HTTP error, body error, or exception) — skip CAPI
        console.error('[meta-lead] Bad lead — Zoko template failed synchronously, skipping CAPI:', JSON.stringify(results.zoko));
        const templateError = results.zoko.error || results.zoko.details || JSON.stringify(results.zoko);
        await updateTemplateStatus(supabase, normalizedPhone, 'failed', templateError);
    } else {
        // Zoko not configured (no API key) or no template ID — fire CAPI synchronously
        if (results.zoko && results.zoko.success) {
            await updateTemplateStatus(supabase, normalizedPhone, 'sent', null);
        }
        results.capi = await sendCapiEvent({ normalizedPhone, email, fullName, tracking, eventId, sourceUrl, language, variant });
    }

    const isDuplicate = results.supabase?.isDuplicate || false;
    return NextResponse.json({ success: true, isDuplicate, results });
}