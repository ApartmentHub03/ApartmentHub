import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { sha256, normalizePhone, buildUserData, eventId, sendCapiEvent, findZokoCustomerId, addZokoTags } from '@/lib/meta-capi';

const STAGE_ORDER = ['lead', 'scheduled', 'qualified', 'won'];

function stageIndex(stage) {
    const idx = STAGE_ORDER.indexOf(stage);
    return idx === -1 ? -1 : idx;
}

function stageGuard(currentStage, newStage) {
    return stageIndex(newStage) >= stageIndex(currentStage);
}

export async function POST(request) {
    const authHeader = request.headers.get('authorization') || '';
    const expectedToken = process.env.DEALSHEET_WEBHOOK_SECRET;
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[webhook/dealsheet] Payload:', JSON.stringify(body));

    const { phone, status, amount } = body;
    if (!phone || !status) {
        return NextResponse.json({ success: false, message: 'Missing required fields: phone, status' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
        return NextResponse.json({ success: false, message: 'Invalid phone number' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
        return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    // Fetch current lead
    const { data: lead, error: fetchError } = await supabase
        .from('meta_leads')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

    if (fetchError) {
        console.error('[webhook/dealsheet] Fetch error:', fetchError);
        return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 });
    }

    if (!lead) {
        console.log('[webhook/dealsheet] Lead not found for phone:', normalizedPhone);
        return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    }

    console.log('[webhook/dealsheet] Found lead:', lead.id, 'current stage:', lead.stage, 'new status:', status);

    // Stage guard: only allow forward progression
    if (!stageGuard(lead.stage || 'lead', status)) {
        console.log('[webhook/dealsheet] Stage guard blocked:', lead.stage, '->', status);
        return NextResponse.json({
            success: false,
            message: `Stage guard: cannot go from ${lead.stage} to ${status}`,
        }, { status: 409 });
    }

    const zokoApiKey = process.env.ZOKO_API_KEY;
    const results = {};

    // Build common CAPI data
    const userData = await buildUserData(lead);

    switch (status) {
        case 'qualified': {
            const eid = await eventId(normalizedPhone, 'QualifiedLead');
            const capiRes = await sendCapiEvent({
                eventName: 'QualifiedLead',
                eventId: eid,
                actionSource: 'system_generated',
                userData,
                customData: { previous_stage: lead.stage || 'lead' },
            });
            results.capi = capiRes;

            if (zokoApiKey) {
                const customerId = await findZokoCustomerId(zokoApiKey, normalizedPhone);
                if (customerId) {
                    await addZokoTags(zokoApiKey, customerId, ['qualified_lead']);
                    results.zoko = { success: true, customerId };
                }
            }

            console.log('[webhook/dealsheet] Updating', normalizedPhone, 'to stage=qualified');

            const { error: updateErr } = await supabase.from('meta_leads').update({
                stage: 'qualified',
                qualified_at: new Date().toISOString(),
            }).eq('phone', normalizedPhone);

            if (updateErr) {
                console.error('[webhook/dealsheet] qualified update error:', updateErr);
                results.db = { success: false, error: updateErr.message };
            } else {
                console.log('[webhook/dealsheet] Updated', normalizedPhone, 'to stage=qualified');
                results.db = { success: true };
            }

            return NextResponse.json({ success: true, results });
        }

        case 'won': {
            const eid = await eventId(normalizedPhone, 'Purchase');
            const capiRes = await sendCapiEvent({
                eventName: 'Purchase',
                eventId: eid,
                actionSource: 'system_generated',
                userData,
                customData: {
                    currency: 'EUR',
                    value: amount ? parseFloat(amount) : undefined,
                    previous_stage: lead.stage || 'scheduled',
                },
            });
            results.capi = capiRes;

            if (zokoApiKey) {
                const customerId = await findZokoCustomerId(zokoApiKey, normalizedPhone);
                if (customerId) {
                    await addZokoTags(zokoApiKey, customerId, ['deal_won']);
                    results.zoko = { success: true, customerId };
                }
            }

            const updateData = {
                stage: 'won',
                won_at: new Date().toISOString(),
            };
            if (amount) {
                updateData.amount = parseFloat(amount);
            }

            console.log('[webhook/dealsheet] Updating', normalizedPhone, 'to stage=won', amount ? `amount=${amount}` : '');

            const { error: updateErr } = await supabase.from('meta_leads')
                .update(updateData)
                .eq('phone', normalizedPhone);

            if (updateErr) {
                console.error('[webhook/dealsheet] won update error:', updateErr);
                results.db = { success: false, error: updateErr.message };
            } else {
                console.log('[webhook/dealsheet] Updated', normalizedPhone, 'to stage=won');
                results.db = { success: true };
            }

            return NextResponse.json({ success: true, results });
        }

        default:
            return NextResponse.json({ success: false, message: `Unknown status: ${status}` }, { status: 400 });
    }
}
