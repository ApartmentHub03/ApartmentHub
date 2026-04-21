'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Fetch admin API endpoints with Bearer token from sessionStorage.
 * Supports lazy (manual) mode and eager (on-mount) mode.
 *
 * @param {string} url - API endpoint
 * @param {object} [opts]
 * @param {boolean} [opts.lazy] - if true, wait for manual refresh() call
 * @param {object} [opts.init] - fetch init override
 */
export function useAdminFetch(url, opts = {}) {
    const { lazy = false, init = {} } = opts;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(!lazy);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    // Serialize init so we only re-create fetchData when its shape changes
    const initKey = JSON.stringify(init);

    const fetchData = useCallback(async () => {
        if (!url) return;
        // Cancel previous request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const parsedInit = initKey ? JSON.parse(initKey) : {};
            const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
            const response = await fetch(url, {
                ...parsedInit,
                headers: {
                    ...(parsedInit.headers || {}),
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || body.message || `HTTP ${response.status}`);
            }

            const json = await response.json();
            setData(json);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError(err.message || 'Failed to fetch');
            }
        } finally {
            setLoading(false);
        }
    }, [url, initKey]);

    useEffect(() => {
        if (!lazy) fetchData();
        return () => abortRef.current?.abort();
    }, [fetchData, lazy]);

    return { data, loading, error, refresh: fetchData };
}
