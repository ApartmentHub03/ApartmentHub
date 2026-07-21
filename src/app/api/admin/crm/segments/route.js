import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Returns candidate segments with live member counts from candidate_segment_members.
// Members are active Zoko contacts synced daily by n8n.
// Excludes archived members and optionally members tagged "student".

const EXCLUDED_TAGS = ['OPT_OUT', 'OPT-IN', 'Rotterdam', 'Almere'];

function hasStudentTag(tags) {
    if (!Array.isArray(tags)) return false;
    return tags.some((t) => String(t).toLowerCase() === 'student');
}

function hasExcludedTag(tags) {
    if (!Array.isArray(tags)) return false;
    const lower = tags.map((t) => String(t).toLowerCase());
    return EXCLUDED_TAGS.some((ex) => lower.includes(ex.toLowerCase()));
}

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    try {
        const url = new URL(request.url);
        const excludeStudents = url.searchParams.get('excludeStudents') === 'true';

        const supabase = serviceClient();

        // Load canonical segments
        const { data: segments, error: segErr } = await supabase
            .from('candidate_segments')
            .select('id, name, min_budget, max_budget, min_bedrooms')
            .order('min_budget', { ascending: true })
            .order('min_bedrooms', { ascending: true });
        if (segErr) throw segErr;
        if (!segments || segments.length === 0) {
            return NextResponse.json({ success: true, segments: [] });
        }

        // Count active members per segment.
        // We do this in one query grouped by segment_id for efficiency.
        const segmentIds = segments.map((s) => s.id);
        const { data: counts, error: countErr } = await supabase
            .from('candidate_segment_members')
            .select('segment_id, tags')
            .in('segment_id', segmentIds)
            .eq('is_archived', false);
        if (countErr) throw countErr;

        const countMap = new Map();
        for (const row of counts || []) {
            if (hasExcludedTag(row.tags)) continue;
            if (excludeStudents && hasStudentTag(row.tags)) continue;
            countMap.set(row.segment_id, (countMap.get(row.segment_id) || 0) + 1);
        }

        const result = segments.map((seg) => {
            const maxBudget = seg.max_budget;
            return {
                id: `${seg.min_budget}-${maxBudget === null ? 'plus' : maxBudget}-${seg.min_bedrooms}`,
                name: seg.name,
                min_budget: Number(seg.min_budget),
                max_budget: maxBudget === null ? null : Number(maxBudget),
                min_bedrooms: Number(seg.min_bedrooms),
                count: countMap.get(seg.id) || 0,
            };
        });

        return NextResponse.json({ success: true, segments: result });
    } catch (err) {
        console.error('[crm/segments] GET error:', err);
        return failed('crm/segments GET', err, 'Failed to load segment counts');
    }
}
