import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/salesforce/documents-complete
 *
 * Triggers the forward-docs-to-salesforce edge function on demand.
 * Called when the user clicks "Submit Application" on the Aanvraag page.
 *
 * Body: { account_id, tenant_name, phone_number, salesforce_account_id }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { account_id, tenant_name, phone_number, salesforce_account_id } = body;

        if (!account_id || !phone_number) {
            return Response.json(
                { success: false, error: 'Missing account_id or phone_number' },
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

        // Call the forward-docs-to-salesforce edge function directly
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/forward-docs-to-salesforce`;

        console.log('[Salesforce Docs] Calling edge function:', edgeFunctionUrl, {
            account_id,
            tenant_name,
            phone_number: phone_number?.slice(0, 6) + '***', // Mask PII in logs
        });

        const edgeResponse = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'User-Agent': 'ApartmentHub-Submit-Trigger',
            },
            body: JSON.stringify({
                account_id,
                tenant_name,
                phone_number,
                salesforce_account_id,
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
        });

        return Response.json({
            success: true,
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
