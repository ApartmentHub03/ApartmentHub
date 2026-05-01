import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';
import { findOpenSeoPr, getPr, mergePr } from '@/lib/seo/githubPr';

// POST /api/admin/seo/develop/merge
// Merges the open `seo -> main` PR. On success, marks every in_progress
// job as completed and stamps them with the PR number/URL.
export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const slim = await findOpenSeoPr();
        if (!slim) {
            return NextResponse.json(
                { success: false, error: 'No open SEO PR found to merge' },
                { status: 404 }
            );
        }
        const pr = await getPr(slim.number);

        // mergeable can be null if GitHub hasn't computed yet — surface that
        // so the UI can ask the user to retry rather than blowing up.
        if (pr.mergeable === false) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'PR is not mergeable — there are merge conflicts',
                    mergeable_state: pr.mergeable_state,
                    pr_url: pr.html_url,
                    pr_number: pr.number,
                },
                { status: 409 }
            );
        }
        if (pr.mergeable === null) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'GitHub is still computing mergeability — try again in a few seconds',
                    mergeable_state: pr.mergeable_state,
                },
                { status: 425 }
            );
        }

        const result = await mergePr(pr.number, {
            commitTitle: `${pr.title} (#${pr.number})`,
        });

        const supabase = getSupabaseServer();
        if (supabase) {
            const now = new Date().toISOString();
            await supabase
                .from('seo_dispatch_jobs')
                .update({
                    status: 'completed',
                    pr_number: pr.number,
                    pr_url: pr.html_url,
                    merge_commit_sha: result.sha || null,
                    completed_at: now,
                    updated_at: now,
                })
                .eq('status', 'in_progress');
        }

        return NextResponse.json({
            success: true,
            merged: true,
            pr_number: pr.number,
            pr_url: pr.html_url,
            sha: result.sha,
        });
    } catch (err) {
        return errorResponse(err, err.status || 500);
    }
}
