import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSearchAnalytics } from '@/lib/seo/gscClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { id } = await request.json();
        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing optimization id' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServer();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'No database' }, { status: 500 });
        }

        // Fetch the optimization record
        const { data: opt, error: fetchErr } = await supabase
            .from('seo_optimizations')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr) throw fetchErr;
        if (!opt) {
            return NextResponse.json(
                { success: false, error: 'Optimization not found' },
                { status: 404 }
            );
        }

        if (opt.status !== 'applied') {
            return NextResponse.json(
                { success: false, error: `Cannot measure optimization with status "${opt.status}" — must be "applied"` },
                { status: 400 }
            );
        }

        // Pull current GSC data for the page/query
        const analytics = await getSearchAnalytics(30, 25000);
        const match = analytics.find(
            (row) =>
                row.page === opt.page_path &&
                row.query === opt.query_keyword
        );

        if (!match) {
            return NextResponse.json(
                { success: false, error: 'No GSC data found for this page/query combination' },
                { status: 404 }
            );
        }

        const afterCtr = match.ctr;
        const afterImpressions = match.impressions;
        const afterClicks = match.clicks;
        const afterPosition = match.position;

        const ctrChange = opt.before_ctr != null ? afterCtr - opt.before_ctr : null;
        const newStatus = ctrChange !== null && ctrChange >= 0.005 ? 'success' : 'no_change';

        // Update the optimization with measured data
        const { data: updated, error: updateErr } = await supabase
            .from('seo_optimizations')
            .update({
                status: newStatus,
                after_ctr: afterCtr,
                after_impressions: afterImpressions,
                after_clicks: afterClicks,
                after_position: afterPosition,
                measured_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // Auto-insert success pattern if improved
        if (newStatus === 'success') {
            await supabase
                .from('seo_success_patterns')
                .insert({
                    pattern_type: opt.optimization_type,
                    description: `${opt.optimization_type}: "${opt.before_value}" → "${opt.after_value}"`,
                    avg_ctr_lift: ctrChange,
                    times_used: 1,
                    times_successful: 1,
                    success_rate: 1.0,
                    examples: [{ page: opt.page_path, query: opt.query_keyword, ctrChange }],
                })
                .catch((err) => console.error('[patterns] Insert failed:', err.message));
        }

        return NextResponse.json({
            success: true,
            optimization: updated,
            ctrChange,
            status: newStatus,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
