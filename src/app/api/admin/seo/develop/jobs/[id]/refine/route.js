import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';
import { dispatchToMcp } from '@/lib/seo/dispatchClient';

export async function POST(request, { params }) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'job id required' }, { status: 400 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    const userPrompt = typeof body?.userPrompt === 'string' ? body.userPrompt.trim() : '';
    if (!userPrompt) {
        return NextResponse.json(
            { success: false, error: 'userPrompt is required for refinement' },
            { status: 400 }
        );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json(
            { success: false, error: 'Supabase not configured' },
            { status: 500 }
        );
    }

    const { data: job, error: jobErr } = await supabase
        .from('seo_dispatch_jobs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (jobErr) return errorResponse(jobErr);
    if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }
    if (job.status !== 'in_progress') {
        return NextResponse.json(
            { success: false, error: `Cannot refine a ${job.status} job` },
            { status: 409 }
        );
    }

    const priorPrompts = Array.isArray(job.prompts) ? job.prompts : [];
    const newPrompt = { at: new Date().toISOString(), text: userPrompt, kind: 'refine' };
    const nextPrompts = [...priorPrompts, newPrompt];

    try {
        const dispatchResult = await dispatchToMcp({
            suggestion: job.suggestion,
            type: job.suggestion_type,
            dashboardContext: job.dashboard_context,
            userPrompt,
            priorPrompts: priorPrompts.map((p) => p.text).filter(Boolean),
            isRefinement: true,
            dbJobId: job.id,
            ...(job.mcp_job_id ? { jobId: job.mcp_job_id } : {}),
        });

        const update = {
            prompts: nextPrompts,
            updated_at: new Date().toISOString(),
        };
        if (!job.mcp_job_id && dispatchResult.jobId) {
            update.mcp_job_id = dispatchResult.jobId;
        }
        await supabase.from('seo_dispatch_jobs').update(update).eq('id', id);

        return NextResponse.json({ success: true, jobId: dispatchResult.jobId });
    } catch (err) {
        return errorResponse(err, err.status || 500);
    }
}
