import { NextResponse } from 'next/server';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

const DEFAULT_BRANCH = 'seo';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const projectName = process.env.VERCEL_PROJECT_NAME;
    const teamId = process.env.VERCEL_TEAM_ID;
    const branch = process.env.VERCEL_DEPLOY_BRANCH || DEFAULT_BRANCH;

    if (!token) {
        return NextResponse.json(
            { success: false, error: 'Vercel not configured — set VERCEL_TOKEN' },
            { status: 500 }
        );
    }
    if (!projectId && !projectName) {
        return NextResponse.json(
            {
                success: false,
                error: 'Vercel project not configured — set VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME',
            },
            { status: 500 }
        );
    }

    try {
        const params = new URLSearchParams();
        if (projectId) params.set('projectId', projectId);
        else if (projectName) params.set('app', projectName);
        if (teamId) params.set('teamId', teamId);
        params.set('limit', '20');
        params.set('meta-githubCommitRef', branch);

        const apiUrl = `https://api.vercel.com/v6/deployments?${params.toString()}`;
        const res = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: json?.error?.message || `Vercel API responded ${res.status}`,
                },
                { status: 502 }
            );
        }

        const deployments = Array.isArray(json.deployments) ? json.deployments : [];
        if (deployments.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `No deployments found for branch "${branch}"`,
                },
                { status: 404 }
            );
        }

        const ready =
            deployments.find((d) => d.state === 'READY' || d.readyState === 'READY') ||
            deployments[0];

        const host =
            ready.meta?.branchAlias ||
            ready.url ||
            ready.alias?.[0];
        if (!host) {
            return NextResponse.json(
                { success: false, error: 'Deployment found but URL is missing' },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            url: host.startsWith('http') ? host : `https://${host}`,
            state: ready.state || ready.readyState || null,
            createdAt: ready.created || ready.createdAt || null,
            branch,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
