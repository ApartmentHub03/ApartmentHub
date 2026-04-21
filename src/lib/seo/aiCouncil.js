import Anthropic from '@anthropic-ai/sdk';
import { getSerpResults } from './semrushClient';

// AI Council - the core of the self-improvement loop.
// Inspired by Karpathy's LLM Council with 3 stages:
//   Stage 1: 4 parallel analyst perspectives (Haiku - fast, cheap)
//   Stage 2: Anonymous page ranking (Sonnet - better reasoning)
//   Stage 3: Synthesis into before/after action items (Sonnet)
//
// Incorporates the Notion playbook's structured prompt template for comparing
// your page against top competitors and generating specific optimization fixes.

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';

let client = null;
function getClient() {
    if (client) return client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY env var');
    client = new Anthropic({ apiKey });
    return client;
}

// Council member system prompts - each analyst has a focused lens
const COUNCIL_PROMPTS = {
    technical: `You are a Technical SEO Analyst. Analyze the page data for:
- Meta tag quality (title length, description length, uniqueness)
- Schema markup presence and relevance
- URL structure and canonicalization signals
- Mobile-friendliness indicators
- Core Web Vitals signals inferable from data

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{"score": <0-100>, "findings": ["finding 1", "finding 2"], "recommendations": ["rec 1", "rec 2"]}`,

    content: `You are a Content Quality Analyst. Analyze the page for:
- Content depth and word count vs competitors
- Readability and structure (H1/H2/H3 hierarchy)
- E-E-A-T signals (expertise, experience, authoritativeness, trust)
- Freshness indicators
- Content gaps vs what competitors cover

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{"score": <0-100>, "findings": ["finding 1", "finding 2"], "recommendations": ["rec 1", "rec 2"]}`,

    keyword: `You are a Keyword Optimization Analyst. Analyze the page for:
- Target keyword alignment with title/H1/content
- Search intent match (informational, transactional, navigational)
- Keyword cannibalization risk
- Long-tail opportunities from GSC query data
- Semantic relevance to the page topic

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{"score": <0-100>, "findings": ["finding 1", "finding 2"], "recommendations": ["rec 1", "rec 2"]}`,

    ux: `You are a UX Signals Analyst. Analyze the page for:
- CTR vs expected CTR for its ranking position
- Bounce rate and engagement duration (if available)
- Title/meta compelling-ness (click-worthiness)
- Featured snippet opportunities
- Mobile usability indicators

Return ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{"score": <0-100>, "findings": ["finding 1", "finding 2"], "recommendations": ["rec 1", "rec 2"]}`,
};

async function runCouncilMember(memberKey, pageData) {
    const prompt = COUNCIL_PROMPTS[memberKey];
    const userContent = `Analyze this page:
${JSON.stringify(pageData, null, 2)}

Return your analysis as JSON only.`;

    try {
        const response = await getClient().messages.create({
            model: HAIKU_MODEL,
            max_tokens: 800,
            system: prompt,
            messages: [{ role: 'user', content: userContent }],
        });

        const text = response.content?.[0]?.text || '{}';
        return parseJsonSafe(text);
    } catch (err) {
        console.error(`[aiCouncil] ${memberKey} failed:`, err.message);
        return { score: 0, findings: [], recommendations: [], error: err.message };
    }
}

function parseJsonSafe(text) {
    // Strip possible markdown fences
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    try {
        return JSON.parse(cleaned);
    } catch {
        // Try to find a JSON object in the text
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch {
                /* fall through */
            }
        }
        return { score: 0, findings: ['Failed to parse AI response'], recommendations: [] };
    }
}

/**
 * Stage 1: Run all 4 council members in parallel.
 * @param {object} pageData - normalized page data for analysis
 * @returns {Promise<{technical, content, keyword, ux}>}
 */
export async function runCouncilAnalysis(pageData) {
    const [technical, content, keyword, ux] = await Promise.all([
        runCouncilMember('technical', pageData),
        runCouncilMember('content', pageData),
        runCouncilMember('keyword', pageData),
        runCouncilMember('ux', pageData),
    ]);
    return { technical, content, keyword, ux };
}

/**
 * Stage 3: Synthesize council output + competitor data into actionable
 * before/after suggestions. Uses the Notion playbook prompt template.
 *
 * @param {object} params
 * @param {object} params.yourPage - scraped data from your page
 * @param {object} params.gscData - GSC metrics for this page
 * @param {Array} params.competitors - scraped competitor pages (top 3)
 * @param {object} params.councilScores - output from runCouncilAnalysis
 * @param {string} params.targetQuery - the keyword being targeted
 */
export async function synthesizeOptimizations({
    yourPage,
    gscData,
    competitors,
    councilScores,
    targetQuery,
    successPatterns = [],
}) {
    const systemPrompt = `You are a senior SEO strategist synthesizing a council of 4 analysts into actionable optimization recommendations.

Your job is to compare the user's page against top competitors and generate SPECIFIC before/after suggestions for:
1. Title tag optimization (compelling, keyword-rich, includes year/price signals if relevant)
2. Meta description improvements (value prop + CTA, 140-155 chars)
3. Missing H2 sections that competitors cover
4. Schema markup opportunities (HowTo, FAQ, LocalBusiness, etc.)
5. Content gaps (specific topics competitors have)
6. Featured snippet opportunities (40-50 word direct answers)

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "overallScore": <0-100>,
  "competitorComparison": {
    "currentTitle": "<current title>",
    "suggestedTitle": "<improved title>",
    "topCompetitorTitles": ["<comp 1>", "<comp 2>", "<comp 3>"],
    "reasoning": "<1-2 sentence reason>"
  },
  "actionItems": [
    {
      "action": "<what to do>",
      "before": "<current state if applicable>",
      "after": "<suggested change if applicable>",
      "impact": "high|medium|low",
      "effort": "low|medium|high",
      "category": "title|meta|h2|schema|content|featured_snippet"
    }
  ]
}

Prioritize QUICK WINS first (title/meta changes) as they deliver the fastest CTR lifts.

If proven success patterns are provided below, factor them into your recommendations — these represent optimizations that previously delivered measurable CTR or ranking improvements on this same site.`;

    const userContent = `Target query: "${targetQuery}"

YOUR PAGE:
${JSON.stringify(yourPage, null, 2)}

GSC METRICS:
${JSON.stringify(gscData, null, 2)}

TOP 3 COMPETITORS:
${JSON.stringify(competitors, null, 2)}

COUNCIL SCORES:
${JSON.stringify(councilScores, null, 2)}

PROVEN SUCCESS PATTERNS (from this site):
${successPatterns.length > 0 ? JSON.stringify(successPatterns, null, 2) : 'No patterns recorded yet.'}

Generate actionable before/after recommendations as JSON.`;

    try {
        const response = await getClient().messages.create({
            model: SONNET_MODEL,
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent }],
        });

        const text = response.content?.[0]?.text || '{}';
        return parseJsonSafe(text);
    } catch (err) {
        console.error('[aiCouncil] synthesis failed:', err.message);
        return {
            overallScore: 0,
            competitorComparison: null,
            actionItems: [],
            error: err.message,
        };
    }
}

/**
 * Full orchestration: takes raw opportunity data and returns prioritized
 * optimization recommendations. Used by the /ai/analyze route.
 *
 * @param {Array} opportunities - from gscClient.getOpportunities()
 * @param {function} scrapeFn - async (url) => scraped data
 * @param {number} maxPages - how many top opportunities to analyze
 */
export async function runFullAnalysis({ opportunities, scrapeFn, maxPages = 5 }) {
    const topOpportunities = opportunities.slice(0, maxPages);
    const results = [];

    // Load success patterns from DB to feed into synthesis
    let successPatterns = [];
    try {
        const { getSupabaseServer } = await import('@/lib/supabaseServer');
        const supabase = getSupabaseServer();
        if (supabase) {
            const { data } = await supabase
                .from('seo_success_patterns')
                .select('*')
                .order('avg_ctr_lift', { ascending: false })
                .limit(20);
            successPatterns = data || [];
        }
    } catch (err) {
        console.warn('[aiCouncil] Could not load success patterns:', err.message);
    }

    for (const opp of topOpportunities) {
        try {
            // 1. Scrape your page
            const yourPage = await scrapeFn(opp.page);
            if (!yourPage) {
                console.warn(`[aiCouncil] Could not scrape ${opp.page}, skipping`);
                continue;
            }

            // 2. Fetch SERP competitors via SEMrush, scrape top 3
            let competitors = [];
            try {
                const serpResults = await getSerpResults(opp.query, 'nl', 5);
                const competitorUrls = serpResults
                    .filter((r) => !r.url.includes('apartmenthub.nl'))
                    .slice(0, 3);
                const scraped = await Promise.allSettled(
                    competitorUrls.map((r) => scrapeFn(r.url))
                );
                competitors = scraped
                    .filter((r) => r.status === 'fulfilled' && r.value)
                    .map((r, i) => ({
                        ...r.value,
                        serpPosition: competitorUrls[i].position,
                    }));
            } catch (err) {
                console.warn('[aiCouncil] SERP fetch failed, continuing without competitors:', err.message);
            }

            // 3. Run council analysis (4 parallel analysts)
            const councilScores = await runCouncilAnalysis({
                pagePath: opp.page,
                targetQuery: opp.query,
                yourPage,
                gscData: {
                    impressions: opp.impressions,
                    clicks: opp.clicks,
                    ctr: opp.ctr,
                    position: opp.position,
                },
            });

            // 4. Synthesize with success patterns
            const synthesis = await synthesizeOptimizations({
                yourPage,
                gscData: {
                    impressions: opp.impressions,
                    clicks: opp.clicks,
                    ctr: opp.ctr,
                    position: opp.position,
                },
                competitors,
                councilScores,
                targetQuery: opp.query,
                successPatterns,
            });

            results.push({
                pagePath: opp.page,
                targetQuery: opp.query,
                gscData: {
                    impressions: opp.impressions,
                    clicks: opp.clicks,
                    ctr: opp.ctr,
                    position: opp.position,
                },
                scores: {
                    technical: councilScores.technical?.score || 0,
                    content: councilScores.content?.score || 0,
                    keyword: councilScores.keyword?.score || 0,
                    ux: councilScores.ux?.score || 0,
                },
                overallScore: synthesis.overallScore || 0,
                competitorComparison: synthesis.competitorComparison,
                actionItems: synthesis.actionItems || [],
                councilDetails: councilScores,
            });
        } catch (err) {
            console.error(`[aiCouncil] failed for ${opp.page}:`, err.message);
        }
    }

    // Sort by score ascending (lowest = highest priority)
    results.sort((a, b) => a.overallScore - b.overallScore);
    return results;
}
