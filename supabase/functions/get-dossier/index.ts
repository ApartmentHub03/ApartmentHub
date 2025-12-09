import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get dossier with all related data
    const { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    if (dossierError || !dossier) {
      return new Response(
        JSON.stringify({ error: "Dossier not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get personen
    const { data: personen, error: personenError } = await supabase
      .from('personen')
      .select('*')
      .eq('dossier_id', dossier.id);

    if (personenError) {
      console.error('Error fetching personen:', personenError);
    }

    // Get documenten for each persoon
    const personenWithDocs = await Promise.all(
      (personen || []).map(async (persoon) => {
        const { data: documenten } = await supabase
          .from('documenten')
          .select('*')
          .eq('persoon_id', persoon.id);

        return {
          ...persoon,
          documenten: documenten || [],
        };
      })
    );

    // Get bid info
    const { data: bidInfo } = await supabase
      .from('biedingen')
      .select('*')
      .eq('dossier_id', dossier.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const response = {
      dossier: {
        id: dossier.id,
        apartment_id: dossier.apartment_id,
        apartment_address: dossier.apartment_address,
        is_complete: dossier.is_complete,
      },
      personen: personenWithDocs,
      bid: bidInfo || null,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-dossier:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});