import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';
import {
    listZokoSegments,
    getZokoSegmentCustomers,
    parseSegmentName,
    normalizePhone,
} from '@/services/zokoSegments';

// Direct Zoko Segments API sync.
//
// GET  — lists all Zoko segments (fast, no member fetch).
// POST — syncs ONE segment: fetches its customers from Zoko and replaces
//        all candidate_segment_members rows for that segment.
//        Body: { zokoSegmentId, zokoSegmentName?, zokoCreatedAt?, batchId, finalize? }
//
// The CRM UI loops through segments client-side (one POST per segment) to
// respect Zoko's 1-req/5-sec rate limit while showing live progress.
// On the last call set finalize: true to archive members in segments that
// were not touched in this sync run.

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    try {
        const segments = await listZokoSegments();
        return NextResponse.json({ success: true, segments });
    } catch (err) {
        return failed('crm/sync/zoko-segments GET', err, 'Failed to list Zoko segments');
    }
}

export async function POST(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { zokoSegmentId, zokoSegmentName, zokoCreatedAt, batchId, finalize } = body || {};

    if (!zokoSegmentId || typeof zokoSegmentId !== 'string') {
        return NextResponse.json({ success: false, message: 'zokoSegmentId is required' }, { status: 400 });
    }
    if (!batchId || typeof batchId !== 'string') {
        return NextResponse.json({ success: false, message: 'batchId is required' }, { status: 400 });
    }

    try {
        const supabase = serviceClient();
        const syncStartedAt = new Date().toISOString();
        let memberCount = 0;

        if (!finalize) {
            // Fetch all customers for this segment from Zoko.
            const customers = await getZokoSegmentCustomers(zokoSegmentId);

            // Parse budget/bedrooms from the segment name for auto-match.
            const parsed = parseSegmentName(zokoSegmentName || '');

            // Upsert the segment row keyed by zoko_segment_id.
            const { data: existingSeg, error: segFindErr } = await supabase
                .from('candidate_segments')
                .select('id')
                .eq('zoko_segment_id', zokoSegmentId)
                .maybeSingle();
            if (segFindErr) throw segFindErr;

            let segmentUuid;

            if (existingSeg) {
                segmentUuid = existingSeg.id;
                const { error: segUpdErr } = await supabase
                    .from('candidate_segments')
                    .update({
                        name: zokoSegmentName || existingSeg.name,
                        zoko_created_at: zokoCreatedAt || null,
                        min_budget: parsed.min_budget,
                        max_budget: parsed.max_budget,
                        min_bedrooms: parsed.min_bedrooms,
                    })
                    .eq('id', segmentUuid);
                if (segUpdErr) throw segUpdErr;
            } else {
                const { data: newSeg, error: segInsErr } = await supabase
                    .from('candidate_segments')
                    .insert({
                        zoko_segment_id: zokoSegmentId,
                        name: zokoSegmentName || '',
                        zoko_created_at: zokoCreatedAt || null,
                        min_budget: parsed.min_budget,
                        max_budget: parsed.max_budget,
                        min_bedrooms: parsed.min_bedrooms,
                    })
                    .select('id')
                    .single();
                if (segInsErr) throw segInsErr;
                segmentUuid = newSeg.id;
            }

            // Delete all existing members for this segment (full replace).
            const { error: delErr } = await supabase
                .from('candidate_segment_members')
                .delete()
                .eq('segment_id', segmentUuid);
            if (delErr) throw delErr;

            // Insert fresh members.
            const rows = customers
                .map((c) => {
                    const phone = normalizePhone(c.phone);
                    if (!phone || phone.length < 7) return null;
                    return {
                        segment_id: segmentUuid,
                        phone,
                        name: c.name || 'Unknown',
                        email: c.email || null,
                        zoko_customer_id: c.id,
                        tags: null,
                        is_archived: false,
                        last_sync_at: syncStartedAt,
                        zoko_sync_batch_id: batchId,
                    };
                })
                .filter(Boolean);

            if (rows.length > 0) {
                // Insert in chunks of 500 to stay within Supabase batch limits.
                for (let i = 0; i < rows.length; i += 500) {
                    const chunk = rows.slice(i, i + 500);
                    const { error: insErr } = await supabase
                        .from('candidate_segment_members')
                        .insert(chunk);
                    if (insErr) throw insErr;
                }
            }

            memberCount = rows.length;
        }

        // Finalize: archive members whose batch doesn't match this run.
        let archivedStale = 0;
        if (finalize) {
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
            zokoSegmentId,
            batchId,
            memberCount,
            archivedStale,
        });
    } catch (err) {
        return failed('crm/sync/zoko-segments POST', err, 'Failed to sync Zoko segment');
    }
}