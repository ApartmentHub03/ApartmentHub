// Helpers for talking to the GitHub REST API for the SEO "Merge" button.
// Server-side only (uses GITHUB_TOKEN).

const API_BASE = 'https://api.github.com';

function ghHeaders() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN not configured');
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };
}

function repoSlug() {
    const repo = process.env.GITHUB_REPO;
    if (!repo || !repo.includes('/')) {
        throw new Error('GITHUB_REPO not configured (expected "owner/repo")');
    }
    return repo;
}

export function getDispatchBranch() {
    return process.env.GITHUB_DISPATCH_BRANCH || 'seo';
}

export function getBaseBranch() {
    return process.env.GITHUB_BASE_BRANCH || 'main';
}

// List open PRs whose head matches the dispatch branch and base matches main.
// GitHub may return mergeable=null until it computes — caller can refetch.
export async function findOpenSeoPr() {
    const repo = repoSlug();
    const head = getDispatchBranch();
    const base = getBaseBranch();
    const owner = repo.split('/')[0];

    const url = `${API_BASE}/repos/${repo}/pulls?head=${owner}:${head}&base=${base}&state=open`;
    const res = await fetch(url, { headers: ghHeaders(), cache: 'no-store' });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`GitHub list PRs ${res.status}: ${body.slice(0, 200)}`);
    }
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return null;
    return list[0];
}

// Fetch a PR by number — needed because the list endpoint returns a slim
// object without `mergeable` / `mergeable_state`.
export async function getPr(number) {
    const repo = repoSlug();
    const url = `${API_BASE}/repos/${repo}/pulls/${number}`;
    const res = await fetch(url, { headers: ghHeaders(), cache: 'no-store' });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`GitHub get PR ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
}

export async function mergePr(number, { commitTitle, commitMessage } = {}) {
    const repo = repoSlug();
    const url = `${API_BASE}/repos/${repo}/pulls/${number}/merge`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
            merge_method: 'squash',
            ...(commitTitle ? { commit_title: commitTitle } : {}),
            ...(commitMessage ? { commit_message: commitMessage } : {}),
        }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json.message || `merge failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        err.body = json;
        throw err;
    }
    return json;
}
