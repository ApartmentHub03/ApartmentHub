import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Paginated, searchable list of candidate_segment_members for the CRM
// Candidates tab. Each row is one (segment, phone) pair; a phone that appears
// in multiple segments shows once per segment.
//
// GET ?q=...&page=1&pageSize=50
//   q        — case-insensitive ilike across name, phone, email
//   page     — 1-based page number (default 1)
//   pageSize — rows per page (default 50, capped at 100)

const MAX_PAGE_SIZE = 100;

export async function GET(request) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get('q') || '').trim();
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50));

        const supabase = serviceClient();

        let query = supabase
            .from('candidate_segment_members')
            .select('id, segment_id, phone, name, email, tags, is_archived, last_sync_at, created_at, candidate_segments(name)', { count: 'exact' })
            .eq('is_archived', false)
            .order('created_at', { ascending: false });

        if (q) {
            query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        const candidates = (data || []).map((row) => ({
            id: row.id,
            segment_id: row.segment_id,
            phone: row.phone,
            name: row.name,
            email: row.email,
            tags: row.tags,
            is_archived: row.is_archived,
            last_sync_at: row.last_sync_at,
            created_at: row.created_at,
            segment_name: row.candidate_segments?.name || null,
        }));

        return NextResponse.json({
            success: true,
            candidates,
            total: count || 0,
            page,
            pageSize,
        });
    } catch (err) {
        return failed('crm/candidates GET', err, 'Failed to load candidates');
    }
}