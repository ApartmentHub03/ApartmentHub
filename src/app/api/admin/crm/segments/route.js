import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Returns candidate segments with live member counts from candidate_segment_members.
// Counts are fetched via the get_segment_counts() SQL function (aggregate query)
// to avoid the Supabase 1000-row response cap that broke client-side counting.
// Excludes archived members and optionally members tagged "student".

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

        // Count active members per segment via SQL function (accurate at any scale).
        const { data: counts, error: countErr } = await supabase
            .rpc('get_segment_counts', { exclude_students: excludeStudents });
        if (countErr) throw countErr;

        const countMap = new Map();
        for (const row of counts || []) {
            countMap.set(row.segment_id, Number(row.member_count) || 0);
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
