import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

function escapeIlike(str) {
    return str.replace(/[%_]/g, (m) => `\\${m}`);
}

function applyFilters(query, { search, source, language, bedrooms, budget, stage, variant }) {
    if (search) {
        const escaped = escapeIlike(search);
        query = query.or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`);
    }
    if (source) {
        query = query.eq('source', source);
    }
    if (language) {
        query = query.eq('language', language);
    }
    if (bedrooms) {
        query = query.ilike('bedrooms', `%${escapeIlike(bedrooms)}%`);
    }
    if (budget) {
        query = query.ilike('budget', `%${escapeIlike(budget)}%`);
    }
    if (stage && ['lead', 'scheduled', 'offer', 'won'].includes(stage)) {
        query = query.eq('stage', stage);
    }
    if (variant && ['A', 'B'].includes(variant)) {
        query = query.eq('variant', variant);
    }
    return query;
}

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const validUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;
    if (!validUsername || !validPassword) {
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }

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
    const stage = searchParams.get('stage') || '';
    const variant = searchParams.get('variant') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = [50, 100, 500].includes(limitParam) ? limitParam : 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const filters = { search, source, language, bedrooms, budget, stage, variant };

    const pagedQuery = applyFilters(
        supabase.from('meta_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to),
        filters
    );

    const allQuery = applyFilters(
        supabase.from('meta_leads').select('created_at,language,source,stage,amount,variant'),
        filters
    );

    const [pagedResult, allResult] = await Promise.all([
        pagedQuery,
        allQuery,
    ]);

    if (pagedResult.error) {
        return NextResponse.json({ success: false, message: pagedResult.error.message }, { status: 500 });
    }
    if (allResult.error) {
        return NextResponse.json({ success: false, message: allResult.error.message }, { status: 500 });
    }

    const leads = pagedResult.data || [];
    const total = pagedResult.count || 0;
    const allLeads = allResult.data || [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString();

    const stats = {
        total,
        today: 0,
        thisWeek: 0,
        byLanguage: {},
        bySource: {},
        byMonth: {},
        byStage: { lead: 0, scheduled: 0, offer: 0, won: 0 },
        totalRevenue: 0,
        bySourceWon: {},
        bySourceRevenue: {},
        byVariant: { A: { leads: 0, won: 0, revenue: 0 }, B: { leads: 0, won: 0, revenue: 0 } },
    };

    for (const l of allLeads) {
        if (l.created_at >= todayStart) stats.today++;
        if (l.created_at >= weekStart) stats.thisWeek++;
        stats.byLanguage[l.language] = (stats.byLanguage[l.language] || 0) + 1;
        if (l.source) {
            stats.bySource[l.source] = (stats.bySource[l.source] || 0) + 1;
            if (l.stage === 'won') {
                stats.bySourceWon[l.source] = (stats.bySourceWon[l.source] || 0) + 1;
                stats.bySourceRevenue[l.source] = (stats.bySourceRevenue[l.source] || 0) + (l.amount || 0);
            }
        }
        const mk = (l.created_at || '').slice(0, 7);
        if (mk) stats.byMonth[mk] = (stats.byMonth[mk] || 0) + 1;
        if (l.stage && stats.byStage[l.stage] !== undefined) stats.byStage[l.stage]++;
        if (l.stage === 'won') stats.totalRevenue += l.amount || 0;
        const v = l.variant || 'A';
        if (stats.byVariant[v]) {
            stats.byVariant[v].leads++;
            if (l.stage === 'won') {
                stats.byVariant[v].won++;
                stats.byVariant[v].revenue += l.amount || 0;
            }
        }
    }

    return NextResponse.json({
        success: true,
        leads,
        total,
        page,
        limit,
        stats: {
            ...stats,
            total: allLeads.length,
        },
    });
}