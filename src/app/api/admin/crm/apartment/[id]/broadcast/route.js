import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Manual broadcast: selects recipients from candidate_segment_members matching
// the chosen segments and fires the existing n8n webhook.
//
// Recipients are active Zoko contacts synced by n8n; no accounts lookup required.
// Excludes archived members and optionally members tagged "student".

const N8N_WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/trigger-status-change-active';

const EXCLUDED_TAGS = ['OPT_OUT', 'OPT-IN', 'Rotterdam', 'Almere'];

function hasStudentTag(tags) {
    if (!Array.isArray(tags)) return false;
    return tags.some((t) => String(t).toLowerCase() === 'student');
}

function hasExcludedTag(tags) {
    if (!Array.isArray(tags)) return false;
    const lower = tags.map((t) => String(t).toLowerCase());
    return EXCLUDED_TAGS.some((ex) => lower.includes(ex.toLowerCase()));
}

// Segment id format: "1500-2000-2" or "5000-plus-3"
function parseSegmentId(id) {
    const parts = id.split('-');
    if (parts.length !== 3) return null;
    const minBudget = Number(parts[0]);
    const maxBudget = parts[1] === 'plus' || parts[1] === 'null' ? null : Number(parts[1]);
    const minBedrooms = Number(parts[2]);
    if (!Number.isFinite(minBudget) || !Number.isFinite(minBedrooms)) return null;
    return { minBudget, maxBudget, minBedrooms };
}

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const { segmentIds, excludeStudents, testPhone } = body || {};

        const testPhoneNormalized = testPhone ? String(testPhone).replace(/\D/g, '') : '';
        const hasTestPhone = testPhoneNormalized.length >= 7;

        if (!hasTestPhone && (!Array.isArray(segmentIds) || segmentIds.length === 0)) {
            return NextResponse.json({ success: false, message: 'Select at least one segment or enter a test phone number' }, { status: 400 });
        }

        const supabase = serviceClient();

        const { data: apt, error: aptErr } = await supabase.from('apartments').select('*').eq('id', id).maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        let matchedTenants = [];

        if (hasTestPhone) {
            matchedTenants = [{
                phone: testPhoneNormalized,
                name: 'Test recipient',
                email: null,
                tags: ['test_broadcast'],
                zoko_customer_id: null,
            }];
        } else {
            // Resolve selected segment criteria to actual segment UUIDs.
            const segmentCriteria = segmentIds.map(parseSegmentId).filter(Boolean);
            if (segmentCriteria.length === 0) {
                return NextResponse.json({ success: false, message: 'Invalid segment IDs' }, { status: 400 });
            }

            const { data: allSegments, error: segErr } = await supabase
                .from('candidate_segments')
                .select('id, min_budget, max_budget, min_bedrooms');
            if (segErr) throw segErr;

            const selectedSegmentIds = new Set();
            for (const seg of allSegments || []) {
                for (const crit of segmentCriteria) {
                    if (
                        Number(seg.min_budget) === crit.minBudget &&
                        (seg.max_budget === null ? crit.maxBudget === null : Number(seg.max_budget) === crit.maxBudget) &&
                        Number(seg.min_bedrooms) === crit.minBedrooms
                    ) {
                        selectedSegmentIds.add(seg.id);
                    }
                }
            }

            if (selectedSegmentIds.size === 0) {
                return NextResponse.json({ success: false, message: 'No matching segments found' }, { status: 400 });
            }

            // Fetch active members for the selected segments.
            const { data: members, error: memErr } = await supabase
                .from('candidate_segment_members')
                .select('phone, name, email, tags, zoko_customer_id')
                .in('segment_id', Array.from(selectedSegmentIds))
                .eq('is_archived', false);
            if (memErr) throw memErr;

            const matchedMap = new Map();
            for (const m of members || []) {
                if (hasExcludedTag(m.tags)) continue;
                if (excludeStudents && hasStudentTag(m.tags)) continue;
                const phone = m.phone;
                if (!phone) continue;
                if (!matchedMap.has(phone)) {
                    matchedMap.set(phone, {
                        phone,
                        name: m.name,
                        email: m.email,
                        tags: m.tags,
                        zoko_customer_id: m.zoko_customer_id,
                    });
                }
            }

            matchedTenants = Array.from(matchedMap.values());
        }

        if (matchedTenants.length === 0) {
            return NextResponse.json({ success: false, message: 'No recipients match the selected segments' }, { status: 400 });
        }

        const payload = {
            event_type: 'status_changed_to_active',
            trigger_operation: 'UPDATE',
            apartment: { ...apt },
            matched_tenants: matchedTenants,
            matched_tenants_count: matchedTenants.length,
            timestamp: new Date().toISOString(),
        };

        try {
            const res = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                console.error('[crm/broadcast] n8n webhook returned', res.status);
                return NextResponse.json({ success: false, message: `n8n webhook returned ${res.status}` }, { status: 502 });
            }
        } catch (webhookErr) {
            console.error('[crm/broadcast] n8n webhook network error:', webhookErr);
            return NextResponse.json({ success: false, message: 'Could not reach n8n webhook' }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            recipientCount: matchedTenants.length,
            message: `Broadcast queued — ${matchedTenants.length} recipients`,
        });
    } catch (err) {
        return failed('crm/broadcast POST', err, 'Failed to broadcast');
    }
}
