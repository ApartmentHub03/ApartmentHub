import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: true, patterns: [] });

        const { data, error } = await supabase
            .from('seo_success_patterns')
            .select('*')
            .order('ctr_lift', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({ success: true, patterns: data || [] });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const body = await request.json();
        const supabase = getSupabaseServer();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'No database' }, { status: 500 });
        }

        const { data, error } = await supabase
            .from('seo_success_patterns')
            .insert(body)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, pattern: data });
    } catch (err) {
        return errorResponse(err);
    }
}
