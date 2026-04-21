// Competitor page scraper.
// Fetches a page and extracts SEO-relevant elements using simple regex parsing
// (no DOM library needed on the server). Designed to be lightweight and fast.

const USER_AGENT =
    'Mozilla/5.0 (compatible; ApartmentHubSEOBot/1.0; +https://apartmenthub.nl)';

/**
 * Fetch and parse a competitor page.
 * @param {string} url
 * @returns {Promise<{url: string, title: string, metaDescription: string, h1s: string[], h2s: string[], h3s: string[], wordCount: number, hasSchema: boolean, schemaTypes: string[], contentSnippet: string} | null>}
 */
export async function scrapePage(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
            console.warn(`[scraper] ${url} returned ${response.status}`);
            return null;
        }

        const html = await response.text();
        return parseSeoElements(url, html);
    } catch (err) {
        console.error(`[scraper] Failed to fetch ${url}:`, err.message);
        return null;
    }
}

/**
 * Parse SEO elements from raw HTML using regex.
 * For competitor analysis we don't need perfect HTML parsing — just the
 * common tags in their outer shell.
 */
export function parseSeoElements(url, html) {
    const title = matchFirst(html, /<title[^>]*>([^<]*)<\/title>/i) || '';

    const metaDescription =
        matchFirst(
            html,
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
        ) ||
        matchFirst(
            html,
            /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i
        ) ||
        '';

    const h1s = matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(stripTags);
    const h2s = matchAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(stripTags);
    const h3s = matchAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi).map(stripTags);

    // Schema markup
    const schemaMatches = matchAll(
        html,
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    const hasSchema = schemaMatches.length > 0;
    const schemaTypes = [];
    for (const match of schemaMatches) {
        try {
            const json = JSON.parse(match);
            if (json['@type']) {
                schemaTypes.push(Array.isArray(json['@type']) ? json['@type'].join(',') : json['@type']);
            }
            if (Array.isArray(json['@graph'])) {
                for (const node of json['@graph']) {
                    if (node['@type']) schemaTypes.push(node['@type']);
                }
            }
        } catch {
            // ignore invalid JSON
        }
    }

    // Body text extraction (rough - strip scripts/styles/tags)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const bodyText = bodyHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    return {
        url,
        title: stripTags(title).trim(),
        metaDescription: metaDescription.trim(),
        h1s: h1s.filter(Boolean),
        h2s: h2s.filter(Boolean),
        h3s: h3s.filter(Boolean),
        wordCount,
        hasSchema,
        schemaTypes: [...new Set(schemaTypes)],
        contentSnippet: bodyText.slice(0, 3000),
    };
}

function matchFirst(text, regex) {
    const m = text.match(regex);
    return m?.[1];
}

function matchAll(text, regex) {
    const results = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
        results.push(m[1]);
    }
    return results;
}

function stripTags(s) {
    if (!s) return '';
    return s
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Scrape multiple competitor URLs in parallel.
 */
export async function scrapeCompetitors(urls) {
    const results = await Promise.all(urls.map(scrapePage));
    return results.filter(Boolean);
}
