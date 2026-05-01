import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';
import { dispatchToMcp } from '@/lib/seo/dispatchClient';
import { getDispatchBranch } from '@/lib/seo/githubPr';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: true, jobs: [] });

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

        let query = supabase
            .from('seo_dispatch_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, jobs: data || [] });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    let payload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON body' },
            { status: 400 }
        );
    }

    const { suggestion, type, dashboardContext, userPrompt } = payload || {};
    if (!suggestion || !type) {
        return NextResponse.json(
            { success: false, error: 'suggestion and type are required' },
            { status: 400 }
        );
    }

    const trimmedPrompt = typeof userPrompt === 'string' ? userPrompt.trim() : '';
    const supabase = getSupabaseServer();

    let jobRow = null;
    if (supabase) {
        const initialPrompts = trimmedPrompt
            ? [{ at: new Date().toISOString(), text: trimmedPrompt, kind: 'initial' }]
            : [];
        const { data, error } = await supabase
            .from('seo_dispatch_jobs')
            .insert({
                suggestion,
                suggestion_type: type,
                dashboard_context: dashboardContext || null,
                prompts: initialPrompts,
                branch: getDispatchBranch(),
                status: 'in_progress',
            })
            .select()
            .single();
        if (error) return errorResponse(error);
        jobRow = data;
    }

    try {
        const dispatchResult = await dispatchToMcp({
            suggestion,
            type,
            dashboardContext,
            ...(trimmedPrompt ? { userPrompt: trimmedPrompt } : {}),
            ...(jobRow ? { dbJobId: jobRow.id } : {}),
        });

        if (jobRow && supabase && dispatchResult.jobId) {
            await supabase
                .from('seo_dispatch_jobs')
                .update({ mcp_job_id: dispatchResult.jobId, updated_at: new Date().toISOString() })
                .eq('id', jobRow.id);
        }

        return NextResponse.json({
            success: true,
            jobId: dispatchResult.jobId,
            dbJobId: jobRow?.id || null,
        });
    } catch (err) {
        if (jobRow && supabase) {
            await supabase
                .from('seo_dispatch_jobs')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', jobRow.id);
        }
        return errorResponse(err, err.status || 500);
    }
}
