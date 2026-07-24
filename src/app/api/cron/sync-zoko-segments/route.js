import { NextResponse } from 'next/server';
import { serviceClient } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';
import {
    listZokoSegments,
    getZokoSegmentCustomers,
    parseSegmentName,
    normalizePhone,
} from '@/services/zokoSegments';

// Cron-triggered Zoko segment sync. Called by pg_cron + pg_net from
// Supabase every hour (delta mode) and every Sunday at 3am (full-replace
// mode) to keep candidate_segment_members fresh without an agent having
// to click "Refresh from Zoko" manually.
//
// POST { "mode": "delta" | "full" }
// Authorization: Bearer <CRON_SECRET>
//
// Delta mode (hourly):
//   For each segment, compare Zoko's current member phones with the DB.
//   Insert only new members, delete only removed members. Unchanged rows
//   are never touched — ~7 writes/hour instead of 24,000.
//
// Full mode (weekly + manual button):
//   Delete all existing members for each segment, insert fresh from Zoko.
//   Guarantees consistency if delta logic ever drifts.
//
// Runs on Vercel serverless (Pro: 300s timeout). pg_net is fire-and-forget
// so the cron job itself completes instantly; the route runs independently.

export const maxDuration = 300;
export const runtime = 'nodejs';

const RATE_LIMIT_MS = 5200;
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function POST(request) {
    // Auth: shared secret in the Authorization header.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const secret = process.env.CRON_SECRET;
    if (!secret || !token || token !== secret) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        body = {};
    }
    const mode = body.mode === 'full' ? 'full' : 'delta';

    const startedAt = new Date().toISOString();
    const batchId = `cron-${mode}-${Date.now()}`;

    try {
        const supabase = serviceClient();

        // 1. List all Zoko segments.
        const zokoSegments = await listZokoSegments();
        console.log(`[cron/sync-zoko-segments] ${mode} mode: ${zokoSegments.length} segments`);

        let totalInserted = 0;
        let totalDeleted = 0;
        let totalArchived = 0;
        const segmentResults = [];

        for (let i = 0; i < zokoSegments.length; i++) {
            if (i > 0) await sleep(RATE_LIMIT_MS);
            const seg = zokoSegments[i];
            console.log(`[cron/sync-zoko-segments] [${i + 1}/${zokoSegments.length}] ${seg.name || seg.id}`);

            try {
                // 2. Fetch customers from Zoko for this segment.
                const customers = await getZokoSegmentCustomers(seg.id);

                // 3. Parse budget/bedrooms from segment name.
                const parsed = parseSegmentName(seg.name || '');

                // 4. Upsert candidate_segments row.
                const { data: existingSeg } = await supabase
                    .from('candidate_segments')
                    .select('id')
                    .eq('zoko_segment_id', seg.id)
                    .maybeSingle();

                let segmentUuid;
                if (existingSeg) {
                    segmentUuid = existingSeg.id;
                    await supabase
                        .from('candidate_segments')
                        .update({
                            name: seg.name || existingSeg.name,
                            zoko_created_at: seg.createdAt || null,
                            min_budget: parsed.min_budget,
                            max_budget: parsed.max_budget,
                            min_bedrooms: parsed.min_bedrooms,
                            last_synced_at: startedAt,
                        })
                        .eq('id', segmentUuid);
                } else {
                    const { data: newSeg, error: insErr } = await supabase
                        .from('candidate_segments')
                        .insert({
                            zoko_segment_id: seg.id,
                            name: seg.name || '',
                            zoko_created_at: seg.createdAt || null,
                            min_budget: parsed.min_budget,
                            max_budget: parsed.max_budget,
                            min_bedrooms: parsed.min_bedrooms,
                            last_synced_at: startedAt,
                        })
                        .select('id')
                        .single();
                    if (insErr) throw insErr;
                    segmentUuid = newSeg.id;
                }

                // 5. Build Zoko member rows.
                const zokoRows = customers
                    .map((c) => {
                        const phone = normalizePhone(c.phone);
                        if (!phone || phone.length < 7) return null;
                        return {
                            segment_id: segmentUuid,
                            phone,
                            name: c.name || 'Unknown',
                            email: c.email || null,
                            zoko_customer_id: c.id,
                            tags: null,
                            is_archived: false,
                            last_sync_at: startedAt,
                            zoko_sync_batch_id: batchId,
                        };
                    })
                    .filter(Boolean);

                const zokoPhoneSet = new Set(zokoRows.map((r) => r.phone));

                if (mode === 'full') {
                    // ── Full-replace: delete all, insert all ──
                    await supabase
                        .from('candidate_segment_members')
                        .delete()
                        .eq('segment_id', segmentUuid);

                    if (zokoRows.length > 0) {
                        for (let j = 0; j < zokoRows.length; j += 500) {
                            const chunk = zokoRows.slice(j, j + 500);
                            const { error: insErr } = await supabase
                                .from('candidate_segment_members')
                                .insert(chunk);
                            if (insErr) throw insErr;
                        }
                    }
                    totalInserted += zokoRows.length;
                } else {
                    // ── Delta: compare and write only changes ──
                    // Fetch current member phones from DB.
                    const { data: dbMembers, error: dbErr } = await supabase
                        .from('candidate_segment_members')
                        .select('id, phone')
                        .eq('segment_id', segmentUuid)
                        .eq('is_archived', false);

                    if (dbErr) throw dbErr;

                    const dbPhoneMap = new Map();
                    for (const m of dbMembers || []) {
                        dbPhoneMap.set(m.phone, m.id);
                    }

                    // Compute diff.
                    const toInsert = zokoRows.filter((r) => !dbPhoneMap.has(r.phone));
                    const toDeleteIds = [];
                    for (const [phone, id] of dbPhoneMap) {
                        if (!zokoPhoneSet.has(phone)) {
                            toDeleteIds.push(id);
                        }
                    }

                    // Insert new members.
                    if (toInsert.length > 0) {
                        for (let j = 0; j < toInsert.length; j += 500) {
                            const chunk = toInsert.slice(j, j + 500);
                            const { error: insErr } = await supabase
                                .from('candidate_segment_members')
                                .insert(chunk);
                            if (insErr) throw insErr;
                        }
                    }

                    // Delete removed members (archive, not hard delete).
                    if (toDeleteIds.length > 0) {
                        const { error: delErr } = await supabase
                            .from('candidate_segment_members')
                            .update({ is_archived: true, zoko_sync_batch_id: batchId })
                            .in('id', toDeleteIds);
                        if (delErr) throw delErr;
                    }

                    totalInserted += toInsert.length;
                    totalDeleted += toDeleteIds.length;
                }

                segmentResults.push({
                    segment: seg.name || seg.id,
                    zokoMembers: zokoRows.length,
                    inserted: mode === 'full' ? zokoRows.length : null,
                    deleted: mode === 'full' ? null : null,
                });
            } catch (segErr) {
                console.error(`[cron/sync-zoko-segments] segment ${seg.name} failed:`, segErr?.message || segErr);
                segmentResults.push({ segment: seg.name || seg.id, error: segErr?.message || 'failed' });
            }
        }

        // 6. Finalize: archive members whose batch doesn't match this run
        //    (segments that were deleted from Zoko won't appear in the loop).
        const { data: staleRows } = await supabase
            .from('candidate_segment_members')
            .select('id')
            .not('last_sync_at', 'is', null)
            .neq('zoko_sync_batch_id', batchId)
            .eq('is_archived', false);

        if (staleRows && staleRows.length > 0) {
            const staleIds = staleRows.map((r) => r.id);
            await supabase
                .from('candidate_segment_members')
                .update({ is_archived: true })
                .in('id', staleIds);
            totalArchived = staleIds.length;
        }

        const durationMs = Date.now() - new Date(startedAt).getTime();
        console.log(`[cron/sync-zoko-segments] done in ${(durationMs / 1000).toFixed(1)}s: inserted=${totalInserted} deleted=${totalDeleted} archived=${totalArchived}`);

        return NextResponse.json({
            success: true,
            mode,
            batchId,
            segments: zokoSegments.length,
            inserted: totalInserted,
            deleted: totalDeleted,
            archived: totalArchived,
            durationMs,
            segmentResults,
        });
    } catch (err) {
        return failed('cron/sync-zoko-segments', err, 'Failed to sync Zoko segments');
    }
}