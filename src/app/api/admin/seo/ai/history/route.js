import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// GET /api/admin/seo/ai/history
// Returns historical scores per page - used to chart improvement over time.

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: true, history: [] });

        const { searchParams } = new URL(request.url);
        const pagePath = searchParams.get('page');

        let query = supabase
            .from('seo_page_scores')
            .select('page_path, overall_score, technical_score, content_score, keyword_score, ux_score, analyzed_at')
            .order('analyzed_at', { ascending: true });

        if (pagePath) query = query.eq('page_path', pagePath);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, history: data || [] });
    } catch (err) {
        return errorResponse(err);
    }
}
