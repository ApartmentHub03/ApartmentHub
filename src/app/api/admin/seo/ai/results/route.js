import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// GET /api/admin/seo/ai/results
// Returns the most recent AI council run results.

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const supabase = getSupabaseServer();
        if (!supabase) {
            return NextResponse.json({ success: true, lastRun: null, results: [] });
        }

        // Most recent completed run
        const { data: lastRun } = await supabase
            .from('seo_ai_runs')
            .select('*')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const results = lastRun?.output_data?.results || [];

        return NextResponse.json({
            success: true,
            lastRun: lastRun
                ? {
                      id: lastRun.id,
                      created_at: lastRun.created_at,
                      completed_at: lastRun.completed_at,
                      pages_analyzed: lastRun.pages_analyzed,
                  }
                : null,
            results,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
