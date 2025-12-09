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
    
    const token = req.headers.get('x-auth-token');
    if (!token) {
      console.error('[add-person] No auth token in x-auth-token header');
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
    const dossier_id = payload.dossier_id as string;

    console.log('[add-person] Token verified for phone:', phone_number);

    const { rol, naam, whatsapp, workStatus, linkedToPersoonId } = await req.json();
    
    console.log('[add-person] Request data:', { rol, naam, whatsapp, workStatus, linkedToPersoonId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify dossier belongs to user
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

    if (!dossier || dossier.phone_number !== phone_number) {
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

    if (rol === 'Garantsteller' && (garantstellerCount || 0) >= 2) {
      console.error('[add-person] Maximum garantstellers bereikt');
      return new Response(
        JSON.stringify({ success: false, error: "Maximum 2 garantstellers bereikt" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new persoon
    const { data: newPersoon, error: persoonError } = await supabase
      .from('personen')
      .insert({
        dossier_id,
        rol,
        naam,
        whatsapp,
        linked_to_persoon_id: rol === 'Garantsteller' ? linkedToPersoonId : null,
        is_required: true,
        docs_complete: false,
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
    const documentInserts = requiredDocs.map(docType => ({
      persoon_id: newPersoon.id,
      type: docType,
      is_required: docType !== 'Extra inkomen', // Extra inkomen is optional
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