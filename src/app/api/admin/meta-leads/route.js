import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(request) {
    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const language = searchParams.get('language') || '';
    const bedrooms = searchParams.get('bedrooms') || '';
    const budget = searchParams.get('budget') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('meta_leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (source) {
        query = query.eq('source', source);
    }
    if (language) {
        query = query.eq('language', language);
    }
    if (bedrooms) {
        query = query.ilike('bedrooms', `%${bedrooms}%`);
    }
    if (budget) {
        query = query.ilike('budget', `%${budget}%`);
    }

    const { data: leads, count: total, error } = await query;

    if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString();

    const stats = {
        total: total || 0,
        today: 0,
        thisWeek: 0,
        byLanguage: {},
        bySource: {},
    };

    for (const l of leads || []) {
        if (l.created_at >= todayStart) stats.today++;
        if (l.created_at >= weekStart) stats.thisWeek++;
        stats.byLanguage[l.language] = (stats.byLanguage[l.language] || 0) + 1;
        if (l.source) stats.bySource[l.source] = (stats.bySource[l.source] || 0) + 1;
    }

    return NextResponse.json({
        success: true,
        leads: leads || [],
        total: total || 0,
        page,
        limit,
        stats,
    });
}