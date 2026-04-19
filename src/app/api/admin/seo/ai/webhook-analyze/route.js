import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getTrafficData, getTopPages } from '@/lib/seo/ga4Client';
import { getDomainOverview, getBacklinks } from '@/lib/seo/semrushClient';
import { getSiteTotals, getOpportunities } from '@/lib/seo/gscClient';
import { getPageInsights } from '@/lib/seo/metaClient';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    let provider = 'groq';
    try {
        const body = await request.json().catch(() => ({}));
        if (body?.provider === 'gemini' || body?.provider === 'groq') {
            provider = body.provider;
        }
    } catch { /* no body is fine */ }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (provider === 'gemini' && !geminiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }
    if (provider === 'groq' && !groqKey) {
        return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const supabase = getSupabaseServer();
    let runId = null;

    try {
        if (supabase) {
            const { data: runRow } = await supabase
                .from('seo_ai_runs')
                .insert({
                    run_type: 'webhook_analysis',
                    status: 'running',
                    input_data: { trigger: 'dashboard_button', provider },
                    started_at: new Date().toISOString(),
                })
                .select()
                .single();
            runId = runRow?.id;
        }

        if (!runId) {
            throw new Error('Failed to create analysis run record');
        }

        const results = await Promise.allSettled([
            getCachedOrFetch('ga4:traffic:7daysAgo', () => getTrafficData('7daysAgo', 'today'), 3600),
            getCachedOrFetch('ga4:top_pages:10', () => getTopPages(10), 3600),
            getCachedOrFetch(
                'semrush:domain_overview:apartmenthub.nl:nl',
                () => getDomainOverview('apartmenthub.nl', 'nl'),
                86400
            ),
            getCachedOrFetch(
                'semrush:backlinks:apartmenthub.nl',
                () => getBacklinks('apartmenthub.nl'),
                86400
            ),
            getCachedOrFetch('gsc:totals:30d', () => getSiteTotals(30), 21600),
            getCachedOrFetch(
                'gsc:opportunities:50:0.03:30:10',
                () => getOpportunities({ minImpressions: 50, maxCtr: 0.03, days: 30, limit: 10 }),
                21600
            ),
            getCachedOrFetch('meta:insights:day:7', () => getPageInsights('day', 7), 3600),
        ]);

        const unwrap = (r) => (r.status === 'fulfilled' ? r.value.data : null);
        const [traffic, topPages, semrushDomain, semrushBacklinks, gscTotals, gscOpportunities, metaInsights] =
            results.map(unwrap);

        const seoSnapshot = {
            collectedAt: new Date().toISOString(),
            domain: 'apartmenthub.nl',
            ga4: { traffic, topPages },
            semrush: { domain: semrushDomain, backlinks: semrushBacklinks },
            gsc: { totals: gscTotals, opportunities: gscOpportunities },
            meta: { insights: metaInsights },
        };

        const previousAnalysis = await fetchPreviousAnalysis(supabase, runId);
        const prompt = buildPrompt(seoSnapshot, previousAnalysis);

        const analysis =
            provider === 'groq'
                ? await callGroq(prompt, groqKey)
                : await callGemini(prompt, geminiKey);

        analysis.provider = provider;

        const sameAsPrevious =
            previousAnalysis != null &&
            buildSignature(analysis) === buildSignature(previousAnalysis);

        if (sameAsPrevious) {
            analysis.sameAsPrevious = true;
        }

        if (supabase) {
            await supabase
                .from('seo_ai_runs')
                .update({
                    status: 'completed',
                    output_data: { webhookAnalysis: analysis },
                    completed_at: new Date().toISOString(),
                })
                .eq('id', runId);
        }

        return NextResponse.json({
            success: true,
            status: 'completed',
            runId,
            analysis,
        });
    } catch (err) {
        console.error('[webhook-analyze] Error:', err.message);
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

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
        return NextResponse.json({ error: 'runId required' }, { status: 400 });
    }

    try {
        const supabase = getSupabaseServer();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const { data: run } = await supabase
            .from('seo_ai_runs')
            .select('id, status, output_data, completed_at, input_data')
            .eq('id', runId)
            .single();

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        if (run.status === 'completed' && run.output_data?.webhookAnalysis) {
            return NextResponse.json({
                runId: run.id,
                status: 'completed',
                analysis: run.output_data.webhookAnalysis,
                completedAt: run.completed_at,
            });
        }

        return NextResponse.json({
            runId: run.id,
            status: run.status,
            analysis: null,
            completedAt: run.completed_at,
        });
    } catch (err) {
        return errorResponse(err);
    }
}

async function fetchPreviousAnalysis(supabase, currentRunId) {
    if (!supabase) return null;
    const { data } = await supabase
        .from('seo_ai_runs')
        .select('id, output_data')
        .eq('run_type', 'webhook_analysis')
        .eq('status', 'completed')
        .neq('id', currentRunId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data?.output_data?.webhookAnalysis || null;
}

function buildPrompt(seoSnapshot, previousAnalysis) {
    const previousSection = previousAnalysis
        ? `
PREVIOUS SUGGESTIONS (you MUST NOT repeat these — provide fresh, different suggestions):
${JSON.stringify(
    {
        summary: previousAnalysis.summary,
        criticalIssues: (previousAnalysis.criticalIssues || []).map((i) => i.issue),
        quickWins: (previousAnalysis.quickWins || []).map((q) => q.action),
        contentSuggestions: (previousAnalysis.contentSuggestions || []).map((c) => ({
            page: c.page,
            suggestion: c.suggestion,
        })),
        keywordOpportunities: (previousAnalysis.keywordOpportunities || []).map((k) => k.keyword),
        monthlyPriorities: previousAnalysis.monthlyPriorities,
    },
    null,
    2
)}

If, after thorough analysis, you truly have no new suggestions beyond the previous ones, return the same suggestions — the system will detect and flag that.
`
        : '';

    return `You are an expert SEO analyst. Analyze the following SEO dashboard data for apartmenthub.nl (a rental platform for apartments in the Netherlands) and provide actionable improvement suggestions.
${previousSection}
SEO DASHBOARD DATA:
${JSON.stringify(seoSnapshot, null, 2)}

Respond ONLY with a valid JSON object (no markdown fences, no extra text) with this structure:

{
  "summary": "Brief overall SEO health assessment (2-3 sentences)",
  "healthScore": 0,
  "criticalIssues": [
    {"issue": "description", "impact": "high|medium|low", "fix": "what to do"}
  ],
  "quickWins": [
    {"action": "specific action", "expectedImpact": "expected improvement", "effort": "low|medium|high", "category": "content|technical|keywords|backlinks|social"}
  ],
  "contentSuggestions": [
    {"page": "/path", "currentIssue": "what's wrong", "suggestion": "what to improve", "priority": "high|medium|low"}
  ],
  "keywordOpportunities": [
    {"keyword": "term", "currentPosition": null, "impressions": 0, "action": "what to do"}
  ],
  "competitorInsights": "Brief analysis of competitive position",
  "monthlyPriorities": ["Priority 1", "Priority 2", "Priority 3"]
}

Focus on actionable, specific recommendations. Prioritize quick wins that can improve CTR and rankings within 2-4 weeks.`;
}

async function callGemini(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7,
            },
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('Gemini returned empty response');
    }

    const parsed = parseJsonLoose(text);
    if (!parsed) {
        throw new Error('Gemini response could not be parsed as JSON');
    }
    return parsed;
}

async function callGroq(prompt, apiKey) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are an expert SEO analyst. Respond ONLY with a single valid JSON object — no markdown fences, no commentary.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
        throw new Error('Groq returned empty response');
    }

    const parsed = parseJsonLoose(text);
    if (!parsed) {
        throw new Error('Groq response could not be parsed as JSON');
    }
    return parsed;
}

function parseJsonLoose(text) {
    try {
        return JSON.parse(text);
    } catch { /* fall through */ }

    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
        try { return JSON.parse(fence[1].trim()); } catch { /* fall through */ }
    }

    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
        try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }

    return null;
}

function buildSignature(analysis) {
    if (!analysis) return null;
    const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const parts = [
        norm(analysis.summary),
        (analysis.criticalIssues || []).map((i) => norm(i.issue)).sort().join('|'),
        (analysis.quickWins || []).map((q) => norm(q.action)).sort().join('|'),
        (analysis.contentSuggestions || []).map((c) => norm(c.suggestion)).sort().join('|'),
        (analysis.keywordOpportunities || []).map((k) => norm(k.keyword)).sort().join('|'),
        (analysis.monthlyPriorities || []).map(norm).sort().join('|'),
    ];
    return parts.join('||');
}
