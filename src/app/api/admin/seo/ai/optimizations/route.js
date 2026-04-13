import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// GET  /api/admin/seo/ai/optimizations      - list all tracked optimizations
// POST /api/admin/seo/ai/optimizations      - update status (mark applied / measured)

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: true, optimizations: [] });

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = supabase
            .from('seo_optimizations')
            .select('*')
            .order('suggested_at', { ascending: false })
            .limit(100);

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, optimizations: data || [] });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const body = await request.json();
        const { id, status, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing optimization id' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: false }, { status: 500 });

        const updateData = { ...updates };
        if (status) {
            updateData.status = status;
            if (status === 'applied') updateData.applied_at = new Date().toISOString();
            if (status === 'measured' || status === 'success' || status === 'no_change') {
                updateData.measured_at = new Date().toISOString();
            }
        }

        const { data, error } = await supabase
            .from('seo_optimizations')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, optimization: data });
    } catch (err) {
        return errorResponse(err);
    }
}
