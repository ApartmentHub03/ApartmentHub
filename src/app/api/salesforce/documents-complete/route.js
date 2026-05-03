/**
 * POST /api/salesforce/documents-complete
 *
 * Thin pass-through to the forward-docs-to-salesforce edge function.
 * The edge function (running on Supabase's network, not the local Next.js
 * dev server) handles account resolution / lazy creation + Salesforce
 * forwarding. We do NOT call Supabase from this route, so local Node
 * networking issues (e.g. IPv6/DNS quirks on Linux) don't affect it.
 *
 * Body: { account_id?, tenant_name?, phone_number, salesforce_account_id?, trigger_source? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { account_id, tenant_name, phone_number, salesforce_account_id } = body;
        const trigger_source = body.trigger_source || 'aanvraag';

        if (!phone_number) {
            return Response.json(
                { success: false, error: 'Missing phone_number' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('[Salesforce Docs] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
            return Response.json(
                { success: false, error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/forward-docs-to-salesforce`;

        console.log('[Salesforce Docs] Calling edge function:', edgeFunctionUrl, {
            account_id: account_id || '(will resolve server-side)',
            tenant_name,
            phone_number: phone_number?.slice(0, 6) + '***',
            trigger_source,
        });

        const edgeResponse = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'User-Agent': 'ApartmentHub-Submit-Trigger',
            },
            body: JSON.stringify({
                account_id: account_id || null,
                tenant_name: tenant_name || null,
                phone_number,
                salesforce_account_id: salesforce_account_id || null,
                trigger_source,
            }),
        });

        const responseText = await edgeResponse.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText.slice(0, 500) };
        }

        if (!edgeResponse.ok) {
            console.error('[Salesforce Docs] Edge function returned error:', edgeResponse.status, responseData);
            return Response.json(
                { success: false, error: `Edge function error: ${edgeResponse.status}`, details: responseData },
                { status: 502 }
            );
        }

        console.log('[Salesforce Docs] ✓ Edge function succeeded:', {
            batch_id: responseData.batch_id,
            docs_total: responseData.docs_total,
            docs_with_files: responseData.docs_with_files,
            trigger_source,
        });

        return Response.json({
            success: true,
            account_id: responseData.account_id,
            batch_id: responseData.batch_id,
            docs_total: responseData.docs_total,
            docs_with_files: responseData.docs_with_files,
            summary: responseData.summary,
        });
    } catch (error) {
        console.error('[Salesforce Docs] Unexpected error:', error);
        return Response.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
