import { NextResponse } from 'next/server';
import { getOpportunities } from '@/lib/seo/gscClient';
import { scrapePage } from '@/lib/seo/competitorScraper';
import { runFullAnalysis } from '@/lib/seo/aiCouncil';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// POST /api/admin/seo/ai/analyze
// Triggers the AI council run. Expensive — don't call on every page load.
// Body: { maxPages?: number, minImpressions?: number, maxCtr?: number }

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    const supabase = getSupabaseServer();
    let runId = null;

    try {
        const body = await request.json().catch(() => ({}));
        const maxPages = Math.min(Number(body.maxPages || 5), 10); // cap at 10 for cost
        const minImpressions = Number(body.minImpressions || 50);
        const maxCtr = Number(body.maxCtr || 0.03);

        // Log the run
        if (supabase) {
            const { data: runRow } = await supabase
                .from('seo_ai_runs')
                .insert({
                    run_type: 'full_audit',
                    status: 'running',
                    input_data: { maxPages, minImpressions, maxCtr },
                    started_at: new Date().toISOString(),
                })
                .select()
                .single();
            runId = runRow?.id;
        }

        // 1. Get opportunities from GSC
        const opportunities = await getOpportunities({
            minImpressions,
            maxCtr,
            days: 30,
            limit: maxPages * 2, // fetch a bit more so we have fallbacks
        });

        if (opportunities.length === 0) {
            if (supabase && runId) {
                await supabase
                    .from('seo_ai_runs')
                    .update({
                        status: 'completed',
                        pages_analyzed: 0,
                        output_data: { message: 'No opportunities found' },
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', runId);
            }
            return NextResponse.json({
                success: true,
                pagesAnalyzed: 0,
                results: [],
                message: 'No high-impression low-CTR pages found yet',
            });
        }

        // 2. Run the AI council
        const results = await runFullAnalysis({
            opportunities,
            scrapeFn: scrapePage,
            maxPages,
        });

        // 3. Persist results to seo_page_scores and seo_ai_runs
        if (supabase) {
            if (runId) {
                await supabase
                    .from('seo_ai_runs')
                    .update({
                        status: 'completed',
                        pages_analyzed: results.length,
                        output_data: { results },
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', runId);
            }

            const scoreRows = results.map((r) => ({
                page_path: r.pagePath,
                overall_score: r.overallScore,
                technical_score: r.scores.technical,
                content_score: r.scores.content,
                keyword_score: r.scores.keyword,
                ux_score: r.scores.ux,
                details: r.councilDetails,
                action_items: r.actionItems,
            }));

            if (scoreRows.length > 0) {
                await supabase.from('seo_page_scores').insert(scoreRows);
            }

            // Store suggested optimizations for tracking
            const optimizationRows = results.flatMap((r) =>
                (r.actionItems || [])
                    .filter((a) => a.before && a.after)
                    .map((a) => ({
                        page_path: r.pagePath,
                        query_keyword: r.targetQuery,
                        optimization_type: a.category || 'other',
                        before_value: a.before,
                        after_value: a.after,
                        before_ctr: r.gscData?.ctr,
                        before_impressions: r.gscData?.impressions,
                        before_clicks: r.gscData?.clicks,
                        before_position: r.gscData?.position,
                        status: 'suggested',
                    }))
            );

            if (optimizationRows.length > 0) {
                await supabase.from('seo_optimizations').insert(optimizationRows);
            }
        }

        return NextResponse.json({
            success: true,
            pagesAnalyzed: results.length,
            runId,
            results,
        });
    } catch (err) {
        if (supabase && runId) {
            await supabase
                .from('seo_ai_runs')
                .update({
                    status: 'failed',
                    output_data: { error: err.message },
                    completed_at: new Date().toISOString(),
                })
                .eq('id', runId);
        }
        return errorResponse(err);
    }
}
