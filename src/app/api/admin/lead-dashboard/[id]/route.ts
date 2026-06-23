import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function PATCH(request: Request) {
    const authHeader = request.headers.get('authorization') || '';
    const validUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (!validUsername || !validPassword) {
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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