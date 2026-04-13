// Meta (Facebook) Graph API wrapper.
// Docs: https://developers.facebook.com/docs/graph-api/
// Base URL: https://graph.facebook.com/v21.0/

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

function getPageAccessToken() {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) throw new Error('Missing META_PAGE_ACCESS_TOKEN env var');
    return token;
}

function getPageId() {
    const id = process.env.META_PAGE_ID;
    if (!id) throw new Error('Missing META_PAGE_ID env var');
    return id;
}

async function metaFetch(endpoint, params = {}) {
    const url = new URL(`${GRAPH_URL}/${endpoint}`);
    url.searchParams.set('access_token', getPageAccessToken());
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const msg = body?.error?.message || response.statusText;
        throw new Error(`Meta API ${response.status}: ${msg}`);
    }

    return response.json();
}

/**
 * Get recent page posts with engagement summary.
 */
export async function getRecentPosts(limit = 25) {
    const pageId = getPageId();
    const data = await metaFetch(`${pageId}/posts`, {
        fields: 'id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)',
        limit,
    });

    return (data.data || []).map((post) => ({
        id: post.id,
        message: post.message || '',
        createdTime: post.created_time,
        permalink: post.permalink_url || '',
        likes: Number(post.likes?.summary?.total_count || 0),
        comments: Number(post.comments?.summary?.total_count || 0),
        shares: Number(post.shares?.count || 0),
    }));
}

/**
 * Get insights for a single post.
 */
export async function getPostInsights(postId) {
    const data = await metaFetch(`${postId}/insights`, {
        metric: 'post_impressions,post_engaged_users,post_clicks',
    });

    const metrics = {};
    (data.data || []).forEach((m) => {
        const val = m.values?.[0]?.value;
        if (m.name === 'post_impressions') metrics.impressions = Number(val || 0);
        if (m.name === 'post_engaged_users') metrics.engagedUsers = Number(val || 0);
        if (m.name === 'post_clicks') metrics.clicks = Number(val || 0);
    });

    return metrics;
}

/**
 * Get page-level insights over a period.
 */
export async function getPageInsights(period = 'day', days = 30) {
    const pageId = getPageId();
    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - days);

    const data = await metaFetch(`${pageId}/insights`, {
        metric: 'page_impressions,page_engaged_users,page_post_engagements,page_fans',
        period,
        since: Math.floor(since.getTime() / 1000),
        until: Math.floor(now.getTime() / 1000),
    });

    const result = {
        impressions: [],
        engagedUsers: [],
        engagements: [],
        fans: 0,
    };

    (data.data || []).forEach((m) => {
        const values = (m.values || []).map((v) => ({
            date: v.end_time?.split('T')[0] || '',
            value: Number(v.value || 0),
        }));

        if (m.name === 'page_impressions') result.impressions = values;
        if (m.name === 'page_engaged_users') result.engagedUsers = values;
        if (m.name === 'page_post_engagements') result.engagements = values;
        if (m.name === 'page_fans') {
            result.fans = values.length > 0 ? values[values.length - 1].value : 0;
        }
    });

    return result;
}

/**
 * Get top performing posts sorted by engagement.
 * Enriches posts with per-post insights.
 */
export async function getTopPosts(limit = 10) {
    const posts = await getRecentPosts(Math.min(limit * 3, 50));

    const enriched = await Promise.allSettled(
        posts.map(async (post) => {
            const insights = await getPostInsights(post.id);
            const impressions = insights.impressions || 0;
            const engagedUsers = insights.engagedUsers || 0;
            return {
                ...post,
                impressions,
                engagedUsers,
                clicks: insights.clicks || 0,
                engagementRate: impressions > 0 ? engagedUsers / impressions : 0,
            };
        })
    );

    return enriched
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value)
        .sort((a, b) => b.engagedUsers - a.engagedUsers)
        .slice(0, limit);
}
