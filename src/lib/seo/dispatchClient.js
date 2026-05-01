// Thin wrapper around the MCP server's /dispatch/seo-develop endpoint.
// Used by the develop/refine API routes so they share a single code path.

export async function dispatchToMcp(payload) {
    const dispatchUrl = process.env.MCP_DISPATCH_URL;
    const dispatchToken = process.env.MCP_DISPATCH_TOKEN;
    if (!dispatchUrl || !dispatchToken) {
        const err = new Error(
            'Dispatch not configured — set MCP_DISPATCH_URL and MCP_DISPATCH_TOKEN'
        );
        err.status = 500;
        throw err;
    }

    const url = `${dispatchUrl.replace(/\/$/, '')}/dispatch/seo-develop`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dispatchToken}`,
        },
        body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(json.error || `Dispatch server responded ${res.status}`);
        err.status = 502;
        throw err;
    }
    return json;
}
