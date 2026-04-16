import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import {
    getKeywordOverview,
    getRelatedKeywords,
    getBroadMatchKeywords,
    getKeywordDifficulty,
    getKeywordAdwords,
} from '@/lib/seo/semrushClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// Consolidated keyword-research endpoint.
// Query params: ?phrase=...&database=nl&include=overview,related,broad,difficulty,adwords
export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const phrase = searchParams.get('phrase');
        const database = searchParams.get('database') || 'nl';
        const include = (searchParams.get('include') || 'overview,related,broad,difficulty')
            .split(',')
            .map((s) => s.trim());

        if (!phrase) {
            return NextResponse.json(
                { success: false, error: 'Missing phrase parameter' },
                { status: 400 }
            );
        }

        const key = (suffix) => `semrush:kw:${suffix}:${database}:${phrase}`;
        const out = {};
        const errors = {};

        const tasks = [];
        if (include.includes('overview')) {
            tasks.push(
                getCachedOrFetch(key('overview'), () => getKeywordOverview(phrase, database), 86400)
                    .then((r) => (out.overview = r.data))
                    .catch((e) => (errors.overview = e.message))
            );
        }
        if (include.includes('related')) {
            tasks.push(
                getCachedOrFetch(key('related'), () => getRelatedKeywords(phrase, database, 25), 86400)
                    .then((r) => (out.related = r.data))
                    .catch((e) => (errors.related = e.message))
            );
        }
        if (include.includes('broad')) {
            tasks.push(
                getCachedOrFetch(key('broad'), () => getBroadMatchKeywords(phrase, database, 25), 86400)
                    .then((r) => (out.broadMatch = r.data))
                    .catch((e) => (errors.broad = e.message))
            );
        }
        if (include.includes('difficulty')) {
            tasks.push(
                getCachedOrFetch(key('difficulty'), () => getKeywordDifficulty(phrase, database), 86400)
                    .then((r) => (out.difficulty = r.data?.[0] || null))
                    .catch((e) => (errors.difficulty = e.message))
            );
        }
        if (include.includes('adwords')) {
            tasks.push(
                getCachedOrFetch(key('adwords'), () => getKeywordAdwords(phrase, database, 10), 86400)
                    .then((r) => (out.adwords = r.data))
                    .catch((e) => (errors.adwords = e.message))
            );
        }

        await Promise.all(tasks);

        return NextResponse.json({
            success: true,
            phrase,
            database,
            ...out,
            errors: Object.keys(errors).length ? errors : undefined,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
