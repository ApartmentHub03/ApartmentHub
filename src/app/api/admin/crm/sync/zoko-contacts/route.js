import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// n8n-driven daily sync of active Zoko contacts into the CRM segment membership table.
// Accepts either:
//   - X-n8n-Secret: n8n-segment-crm   (hardcoded secret for n8n automation)
//   - Authorization: Bearer <crm-token>  (manual admin trigger from the browser)
//
// Contacts are matched to candidate_segments by parsing their Zoko tags.
// Phone numbers are normalized to digits only.
// On the final batch, members not touched in this run are archived.

const N8N_SECRET = 'n8n-segment-crm';
const MAX_BATCH_SIZE = 500;

const EXCLUDED_TAGS = ['ARCHIVED', 'OPT_OUT', 'OPT-IN', 'Rotterdam', 'Almere'];

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

function uniqueStrings(arr) {
    const seen = new Set();
    return (arr || [])
        .map((t) => String(t).trim())
        .filter((t) => {
            const key = t.toLowerCase();
            if (!t || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

async function authenticate(request) {
    const n8nSecret = request.headers.get('x-n8n-secret');
    if (n8nSecret === N8N_SECRET) {
        return { ok: true, source: 'n8n' };
    }

    const auth = await requireCrmUser(request);
    if (auth.response) {
        return { ok: false, response: auth.response };
    }
    return { ok: true, source: 'crm-user', crm: auth.crm };
}

function parseTagPriceRange(tag) {
    const range = String(tag).match(/€?\s*(\d+)\s*-\s*€?\s*(\d+)/);
    if (range) return { min: Number(range[1]), max: Number(range[2]) };
    const plus = String(tag).match(/€?\s*(\d+)\s*\+/);
    if (plus) return { min: Number(plus[1]), max: Infinity };
    return null;
}

function parseTagBedrooms(tag) {
    // Match "1 Bedroom", "2 Bedrooms", "4+ Bedrooms" -> number (case-insensitive)
    const m = String(tag).match(/(\d+)\+?\s*bedroom/i);
    if (!m) return null;
    return Number(m[1]);
}

function hasExcludedTag(tags) {
    if (!Array.isArray(tags)) return false;
    const lower = tags.map((t) => String(t).toLowerCase());
    return EXCLUDED_TAGS.some((ex) => lower.includes(ex.toLowerCase()));
}

function sanitizeContact(raw) {
    const phone = normalizePhone(raw?.phone ?? raw?.whatsapp_number);
    if (!phone || phone.length < 7) return null;

    const name = String(raw?.name ?? raw?.tenant_name ?? '').trim() || 'Unknown';
    const email = raw?.email ? String(raw.email).trim() : null;
    const tags = uniqueStrings(raw?.tags);
    const zokoCustomerId = raw?.zoko_customer_id ? String(raw.zoko_customer_id).trim() : null;

    // Skip contacts explicitly tagged as archived or excluded.
    if (hasExcludedTag(tags)) return null;

    return { phone, name, email, tags, zokoCustomerId };
}

// Returns all candidate segment IDs that this contact belongs to.
function computeSegmentIds(segments, tags) {
    const priceRanges = tags.map(parseTagPriceRange).filter(Boolean);
    const bedroomTags = tags.map(parseTagBedrooms).filter((b) => b !== null);
    const hasBedroomTag = bedroomTags.length > 0;

    return segments
        .filter((seg) => {
            // Price overlap?
            const inPrice = priceRanges.some((pr) => {
                const segMin = Number(seg.min_budget);
                const segMax = seg.max_budget === null ? Infinity : Number(seg.max_budget);
                return pr.max >= segMin && pr.min <= segMax;
            });
            if (!inPrice) return false;

            // Bedroom match. If no bedroom tag, we still assign to all bedroom segments
            // because the contact hasn't specified a preference.
            if (!hasBedroomTag) return true;
            return bedroomTags.includes(seg.min_bedrooms);
        })
        .map((seg) => seg.id);
}

export async function POST(request) {
    const auth = await authenticate(request);
    if (!auth.ok) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { contacts: rawContacts, batchId, isFinalBatch } = body || {};

    if (!batchId || typeof batchId !== 'string') {
        return NextResponse.json({ success: false, message: 'batchId is required' }, { status: 400 });
    }

    if (!Array.isArray(rawContacts)) {
        return NextResponse.json({ success: false, message: 'contacts must be an array' }, { status: 400 });
    }

    if (rawContacts.length === 0 && !isFinalBatch) {
        return NextResponse.json({ success: false, message: 'contacts array is empty' }, { status: 400 });
    }

    if (rawContacts.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
            { success: false, message: `Max batch size is ${MAX_BATCH_SIZE}, got ${rawContacts.length}` },
            { status: 400 }
        );
    }

    const contacts = rawContacts.map(sanitizeContact).filter(Boolean);

    try {
        const supabase = serviceClient();
        const syncStartedAt = new Date().toISOString();

        // Load canonical segments.
        const { data: segments, error: segErr } = await supabase
            .from('candidate_segments')
            .select('id, name, min_budget, max_budget, min_bedrooms');
        if (segErr) throw segErr;
        if (!segments || segments.length === 0) {
            return NextResponse.json({ success: false, message: 'No candidate segments configured' }, { status: 500 });
        }

        let created = 0;
        let updated = 0;
        let unchanged = 0;
        let failed = 0;
        let skippedExcluded = rawContacts.length - contacts.length;

        for (const contact of contacts) {
            const segmentIds = computeSegmentIds(segments, contact.tags);
            if (segmentIds.length === 0) {
                // Contact has no recognizable price/bedroom tags; nothing to do.
                unchanged++;
                continue;
            }

            for (const segmentId of segmentIds) {
                const upsertData = {
                    segment_id: segmentId,
                    phone: contact.phone,
                    name: contact.name,
                    email: contact.email,
                    zoko_customer_id: contact.zokoCustomerId,
                    tags: contact.tags.length > 0 ? contact.tags : null,
                    is_archived: false,
                    last_sync_at: syncStartedAt,
                    zoko_sync_batch_id: batchId,
                };

                const { data: existing, error: findErr } = await supabase
                    .from('candidate_segment_members')
                    .select('id, tags, zoko_customer_id')
                    .eq('segment_id', segmentId)
                    .eq('phone', contact.phone)
                    .maybeSingle();
                if (findErr) {
                    console.error('[crm/sync/zoko-contacts] lookup failed:', findErr, contact.phone, segmentId);
                    failed++;
                    continue;
                }

                if (existing) {
                    const mergedTags = uniqueStrings([...(existing.tags || []), ...contact.tags]);
                    const { error: updErr } = await supabase
                        .from('candidate_segment_members')
                        .update({
                            ...upsertData,
                            tags: mergedTags.length > 0 ? mergedTags : existing.tags || null,
                        })
                        .eq('id', existing.id);
                    if (updErr) {
                        console.error('[crm/sync/zoko-contacts] update failed:', updErr, contact.phone, segmentId);
                        failed++;
                        continue;
                    }
                    const changed =
                        upsertData.name !== existing.name ||
                        (contact.zokoCustomerId && contact.zokoCustomerId !== existing.zoko_customer_id) ||
                        JSON.stringify(mergedTags.slice().sort()) !==
                            JSON.stringify((existing.tags || []).slice().sort());
                    changed ? updated++ : unchanged++;
                } else {
                    const { error: insErr } = await supabase.from('candidate_segment_members').insert(upsertData);
                    if (insErr) {
                        console.error('[crm/sync/zoko-contacts] insert failed:', insErr, contact.phone, segmentId);
                        failed++;
                        continue;
                    }
                    created++;
                }
            }
        }

        let archivedStale = 0;
        if (isFinalBatch) {
            const { data: staleRows, error: staleErr } = await supabase
                .from('candidate_segment_members')
                .select('id')
                .not('last_sync_at', 'is', null)
                .neq('zoko_sync_batch_id', batchId);
            if (staleErr) throw staleErr;

            const ids = (staleRows || []).map((r) => r.id);
            if (ids.length > 0) {
                const { error: archiveErr } = await supabase
                    .from('candidate_segment_members')
                    .update({ is_archived: true, updated_at: syncStartedAt })
                    .in('id', ids);
                if (archiveErr) throw archiveErr;
                archivedStale = ids.length;
            }
        }

        return NextResponse.json({
            success: true,
            batchId,
            isFinalBatch: !!isFinalBatch,
            created,
            updated,
            unchanged,
            failed,
            skippedExcluded,
            archivedStale,
            processedContacts: contacts.length,
        });
    } catch (err) {
        console.error('[crm/sync/zoko-contacts] error:', err);
        return failed('crm/sync/zoko-contacts POST', err, 'Failed to sync Zoko contacts');
    }
}
