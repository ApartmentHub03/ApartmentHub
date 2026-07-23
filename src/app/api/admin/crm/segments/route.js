import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Returns segments with live member counts from candidate_segment_members.
// Segments are keyed by zoko_segment_id (the authoritative Zoko UUID).
// Budget/bedroom fields are parsed from the segment name and may be null.

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    try {
        const supabase = serviceClient();

        // Load all segments that have a zoko_segment_id (the direct-API ones).
        const { data: segments, error: segErr } = await supabase
            .from('candidate_segments')
            .select('id, name, min_budget, max_budget, min_bedrooms, zoko_segment_id')
            .not('zoko_segment_id', 'is', null)
            .order('min_budget', { ascending: true, nullsFirst: false })
            .order('min_bedrooms', { ascending: true, nullsFirst: false });
        if (segErr) throw segErr;
        if (!segments || segments.length === 0) {
            return NextResponse.json({ success: true, segments: [] });
        }

        // Count active members per segment (per-segment count queries to
        // avoid the Supabase 1000-row response cap that breaks client-side counting).
        const countMap = new Map();
        for (const seg of segments) {
            const { count, error: cErr } = await supabase
                .from('candidate_segment_members')
                .select('id', { count: 'exact', head: true })
                .eq('segment_id', seg.id)
                .eq('is_archived', false);
            if (cErr) {
                console.error('[crm/segments] count error for', seg.id, cErr);
                countMap.set(seg.id, 0);
            } else {
                countMap.set(seg.id, count || 0);
            }
        }

        const result = segments.map((seg) => ({
            id: seg.zoko_segment_id,
            name: seg.name,
            min_budget: seg.min_budget !== null ? Number(seg.min_budget) : null,
            max_budget: seg.max_budget !== null ? Number(seg.max_budget) : null,
            min_bedrooms: seg.min_bedrooms !== null ? Number(seg.min_bedrooms) : null,
            count: countMap.get(seg.id) || 0,
        }));

        return NextResponse.json({ success: true, segments: result });
    } catch (err) {
        console.error('[crm/segments] GET error:', err);
        return failed('crm/segments GET', err, 'Failed to load segment counts');
    }
}