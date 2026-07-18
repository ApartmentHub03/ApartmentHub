import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Manual broadcast: re-fires the existing n8n webhook (trigger-status-change-active)
// with the apartment data + recipients matching the selected segments.
//
// The n8n workflow already handles sending WhatsApp messages via the
// pdf_apartment_utility Zoko template. This endpoint just selects the
// recipients based on segment criteria + exclusions and re-triggers it.
//
// No new n8n workflow needed — David doesn't have to change anything.

const N8N_WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/trigger-status-change-active';

const EXCLUSION_TAGS = ['OPT_OUT', 'ARCHIVED', 'Rotterdam', 'Almere'];

function parsePriceRange(tag) {
    const m = tag.match(/€?(\d+)\s*-\s*€?(\d+)/);
    if (!m) return null;
    return { min: Number(m[1]), max: Number(m[2]) };
}

function parseBedrooms(tag) {
    const m = tag.match(/(\d+)\s*Bedroom/);
    if (!m) return null;
    return Number(m[1]);
}

function isExcluded(tags) {
    const lower = tags.map((t) => t.toLowerCase());
    return EXCLUSION_TAGS.some((ex) => lower.includes(ex.toLowerCase()));
}

function isStudent(tags) {
    return tags.some((t) => t.toLowerCase() === 'student');
}

// Parse segment id like "2500-3000-2" → { minBudget: 2500, maxBudget: 3000, minBedrooms: 2 }
function parseSegmentId(id) {
    const parts = id.split('-');
    if (parts.length !== 3) return null;
    return { minBudget: Number(parts[0]), maxBudget: Number(parts[1]), minBedrooms: Number(parts[2]) };
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
        const { segmentIds, excludeStudents } = body || {};
        if (!Array.isArray(segmentIds) || segmentIds.length === 0) {
            return NextResponse.json({ success: false, message: 'Select at least one segment' }, { status: 400 });
        }

        const supabase = serviceClient();

        // Fetch the apartment
        const { data: apt, error: aptErr } = await supabase
            .from('apartments')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        // Fetch all accounts with tags
        const { data: accounts, error: accErr } = await supabase
            .from('accounts')
            .select('id, tenant_name, whatsapp_number, email, tags, preferred_location, move_in_date, work_status, monthly_income, salesforce_account_id, status, documentation_status')
            .not('tags', 'is', null)
            .limit(5000);
        if (accErr) throw accErr;

        // Build the set of segment criteria
        const segmentCriteria = segmentIds.map(parseSegmentId).filter(Boolean);
        if (segmentCriteria.length === 0) {
            return NextResponse.json({ success: false, message: 'Invalid segment IDs' }, { status: 400 });
        }

        // Match accounts to selected segments
        const matchedMap = new Map(); // dedup by account id
        for (const acc of accounts || []) {
            const tags = acc.tags || [];
            if (tags.length === 0) continue;
            if (isExcluded(tags)) continue;
            if (excludeStudents && isStudent(tags)) continue;

            const priceRanges = tags.map(parsePriceRange).filter(Boolean);
            const bedroomTags = tags.map(parseBedrooms).filter((b) => b !== null);

            for (const seg of segmentCriteria) {
                const inPrice = priceRanges.some(
                    (pr) => seg.minBudget >= pr.min && seg.maxBudget <= pr.max
                );
                if (!inPrice) continue;
                const inBedrooms = bedroomTags.length === 0 || bedroomTags.includes(seg.minBedrooms);
                if (!inBedrooms) continue;
                // Match found for this segment
                if (!matchedMap.has(acc.id)) {
                    matchedMap.set(acc.id, {
                        account_id: acc.id,
                        tenant_name: acc.tenant_name,
                        whatsapp_number: acc.whatsapp_number,
                        email: acc.email,
                        tags: acc.tags,
                        preferred_location: acc.preferred_location,
                        move_in_date: acc.move_in_date,
                        work_status: acc.work_status,
                        monthly_income: acc.monthly_income,
                        salesforce_account_id: acc.salesforce_account_id,
                        status: acc.status,
                        documentation_status: acc.documentation_status,
                    });
                }
                break; // one match per account is enough
            }
        }

        const matchedTenants = Array.from(matchedMap.values());

        if (matchedTenants.length === 0) {
            return NextResponse.json({ success: false, message: 'No recipients match the selected segments' }, { status: 400 });
        }

        // Build the same payload format as the auto-trigger
        const payload = {
            event_type: 'status_changed_to_active',
            trigger_operation: 'UPDATE',
            apartment: {
                ...apt,
            },
            matched_tenants: matchedTenants,
            matched_tenants_count: matchedTenants.length,
            timestamp: new Date().toISOString(),
        };

        // Fire the existing n8n webhook (fire-and-forget)
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