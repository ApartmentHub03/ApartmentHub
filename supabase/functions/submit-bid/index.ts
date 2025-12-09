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
        JSON.stringify({ success: false, error: "No authorization header" }),
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
    const dossier_id = payload.dossier_id as string;

    const { amount, motivation, start_date } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify dossier belongs to user
    const { data: dossier } = await supabase
      .from('dossiers')
      .select('*')
      .eq('id', dossier_id)
      .single();

    if (!dossier || dossier.phone_number !== phone_number) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if dossier is complete
    if (!dossier.is_complete) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Dossier moet compleet zijn voordat je een bod kunt doen"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create bid
    const { data: bid, error: bidError } = await supabase
      .from('biedingen')
      .insert({
        dossier_id,
        amount,
        motivation,
        start_date,
        status: 'pending',
      })
      .select()
      .single();

    if (bidError) {
      console.error('Error creating bid:', bidError);
      return new Response(
        JSON.stringify({ success: false, error: bidError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SUCCESS] Bid submitted: ${amount} for dossier ${dossier_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bid_id: bid.id,
        message: "Je bod is succesvol ingediend!"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-bid:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});