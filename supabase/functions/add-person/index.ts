import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token',
};

// Document requirements per work status
const REQUIRED_DOCUMENTS_BY_STATUS: Record<string, string[]> = {
  'student': ['ID-bewijs', 'Inschrijvingsbewijs', 'Extra inkomen'],
  'werknemer': ['ID-bewijs', 'Arbeidscontract of Werkgeversverklaring', 'Loonstroken', 'BRP-uittreksel', 'Extra inkomen'],
  'ondernemer': ['ID-bewijs', 'KvK-uittreksel', 'Jaaropgaves', 'Belastingaangiftes', 'BRP-uittreksel', 'Extra inkomen'],
  'pensioen': ['ID-bewijs', 'Pensioenoverzicht', 'Bankafschriften', 'BRP-uittreksel'],
};

// Document requirements for guarantors by work status
const GUARANTOR_DOCUMENTS_BY_STATUS: Record<string, string[]> = {
  'werknemer': ['ID-bewijs', 'Arbeidscontract of Werkgeversverklaring', 'Loonstroken'],
  'ondernemer': ['ID-bewijs', 'KvK-uittreksel', 'Jaaropgaves', 'Belastingaangiftes'],
  'pensioen': ['ID-bewijs', 'Pensioenoverzicht', 'Bankafschriften'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[add-person] Request received');

    // Parse body first (can only read once)
    const body = await req.json();
    const { rol, naam, whatsapp, workStatus, linkedToPersoonId, linked_to_persoon_id, auth_token: bodyToken, dossier_id: bodyDossierId } = body;

    // Get auth token from body or header
    const token = bodyToken || req.headers.get('x-auth-token');
    if (!token) {
      console.error('[add-person] No auth token provided');
      return new Response(
        JSON.stringify({ success: false, error: "No authentication token provided" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const jwtSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const payload = await verify(token, key);
    const phone_number = payload.phone_number as string;
    // Use dossier_id from body (for invite flow) or from token
    const dossier_id = bodyDossierId || (payload.dossier_id as string);

    console.log('[add-person] Token verified for phone:', phone_number);
    console.log('[add-person] Request data:', { rol, naam, whatsapp, workStatus, linkedToPersoonId: linkedToPersoonId || linked_to_persoon_id });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify dossier exists
    const { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select('phone_number')
      .eq('id', dossier_id)
      .single();

    if (dossierError) {
      console.error('[add-person] Error fetching dossier:', dossierError);
      return new Response(
        JSON.stringify({ success: false, error: "Dossier not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For invite flow (bodyDossierId provided), skip ownership check
    if (!bodyDossierId && (!dossier || dossier.phone_number !== phone_number)) {
      console.error('[add-person] Unauthorized: dossier phone does not match');
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check limits before adding
    const { count: medehuurderCount } = await supabase
      .from('personen')
      .select('*', { count: 'exact', head: true })
      .eq('dossier_id', dossier_id)
      .eq('rol', 'Medehuurder');

    const { count: garantstellerCount } = await supabase
      .from('personen')
      .select('*', { count: 'exact', head: true })
      .eq('dossier_id', dossier_id)
      .eq('rol', 'Garantsteller');

    if (rol === 'Medehuurder' && (medehuurderCount || 0) >= 2) {
      console.error('[add-person] Maximum medehuurders bereikt');
      return new Response(
        JSON.stringify({ success: false, error: "Maximum 2 medehuurders bereikt" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow one guarantor per tenant (main + co-tenants)
    const { count: tenantCount } = await supabase
      .from('personen')
      .select('*', { count: 'exact', head: true })
      .eq('dossier_id', dossier_id)
      .in('rol', ['Hoofdhuurder', 'Medehuurder']);

    const maxGuarantors = Math.max(tenantCount || 1, 2);
    if (rol === 'Garantsteller' && (garantstellerCount || 0) >= maxGuarantors) {
      console.error('[add-person] Maximum garantstellers bereikt');
      return new Response(
        JSON.stringify({ success: false, error: `Maximum ${maxGuarantors} garantstellers bereikt` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Split name into first and last name
    const nameParts = (naam || '').trim().split(' ');
    const voornaam = nameParts[0] || '';
    const achternaam = nameParts.slice(1).join(' ') || '';

    // Resolve linked_to_persoon_id from either camelCase or snake_case body field
    const resolvedLinkedTo = linkedToPersoonId || linked_to_persoon_id || null;

    // Create new persoon
    const { data: newPersoon, error: persoonError } = await supabase
      .from('personen')
      .insert({
        dossier_id,
        rol,
        voornaam,
        achternaam,
        telefoon: whatsapp || null,
        type: rol === 'Hoofdhuurder' ? 'tenant' : rol === 'Medehuurder' ? 'co_tenant' : 'guarantor',
        linked_to_persoon_id: rol === 'Garantsteller' ? resolvedLinkedTo : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (persoonError) {
      console.error('[add-person] Error creating persoon:', persoonError);
      return new Response(
        JSON.stringify({ success: false, error: persoonError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[add-person] Persoon created:', newPersoon.id);

    // Determine required documents based on role and work status
    let requiredDocs: string[] = [];

    if (rol === 'Garantsteller') {
      if (workStatus && GUARANTOR_DOCUMENTS_BY_STATUS[workStatus]) {
        requiredDocs = GUARANTOR_DOCUMENTS_BY_STATUS[workStatus];
      } else {
        // Default guarantor documents
        requiredDocs = ['ID-bewijs', 'Loonstroken', 'Arbeidscontract of Werkgeversverklaring'];
      }
    } else if (workStatus && REQUIRED_DOCUMENTS_BY_STATUS[workStatus]) {
      requiredDocs = REQUIRED_DOCUMENTS_BY_STATUS[workStatus];
    } else {
      // Default documents if work status not provided
      requiredDocs = ['ID-bewijs', 'Loonstroken laatste 3 maanden', 'Arbeidscontract of Werkgeversverklaring'];
    }

    // Create required documents for this persoon
    // Use the person's whatsapp number, falling back to the dossier phone_number
    const docPhoneNumber = whatsapp || phone_number;
    const documentInserts = requiredDocs.map(docType => ({
      persoon_id: newPersoon.id,
      phone_number: docPhoneNumber,
      type: docType,
      status: 'ontbreekt',
    }));

    const { error: docsError } = await supabase
      .from('documenten')
      .insert(documentInserts);

    if (docsError) {
      console.error('[add-person] Error creating documents:', docsError);
      // Don't fail the whole operation if documents fail
    } else {
      console.log('[add-person] Created', documentInserts.length, 'documents');
    }

    // TODO: Send WhatsApp invitation (mock for now)
    console.log(`[add-person] [MOCK] Sending WhatsApp invite to ${whatsapp} for ${naam}`);

    return new Response(
      JSON.stringify({ success: true, persoon: newPersoon }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[add-person] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});