import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { requireCrmUser } from '@/services/crmAuth';

export async function PATCH(request: Request) {
    // Was: "a Bearer token is present" — never validated, so any string could
    // rewrite any lead's stage.
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing lead ID' }, { status: 400 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    const { stage, amount } = body;
    const validStages = ['lead', 'scheduled', 'offer', 'won'];
    if (!stage || !validStages.includes(stage)) {
        return NextResponse.json({ success: false, message: 'Invalid stage' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    const updateData: Record<string, unknown> = { stage };
    if (stage === 'won' && amount != null) {
        updateData.amount = parseFloat(amount) || 0;
        updateData.won_at = new Date().toISOString();
    } else if (stage === 'scheduled') {
        updateData.scheduled_at = new Date().toISOString();
    } else if (stage === 'offer') {
        updateData.qualified_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('meta_leads')
        .update(updateData)
        .eq('id', id);

    if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}