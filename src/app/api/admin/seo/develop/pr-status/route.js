import { NextResponse } from 'next/server';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';
import {
    findOpenSeoPr,
    getPr,
    getDispatchBranch,
    getBaseBranch,
} from '@/lib/seo/githubPr';

// GET /api/admin/seo/develop/pr-status
// Returns mergeability info for the open `<dispatch> -> <base>` PR.
export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const slim = await findOpenSeoPr();
        if (!slim) {
            return NextResponse.json({
                success: true,
                exists: false,
                branch: getDispatchBranch(),
                base: getBaseBranch(),
            });
        }

        // Detail call — `mergeable` / `mergeable_state` only appear here.
        const full = await getPr(slim.number);

        return NextResponse.json({
            success: true,
            exists: true,
            number: full.number,
            url: full.html_url,
            title: full.title,
            state: full.state,
            draft: full.draft,
            mergeable: full.mergeable,
            mergeable_state: full.mergeable_state,
            head: full.head?.ref,
            base: full.base?.ref,
            updated_at: full.updated_at,
        });
    } catch (err) {
        return errorResponse(err, err.status || 500);
    }
}
