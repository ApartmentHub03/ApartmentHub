import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, code } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify code - allow test code 123456 without DB lookup
    let verificationData: any = null;

    if (code === '123456') {
      console.log(`[TEST MODE] Bypassing DB verification for ${phone_number} with code 123456`);
    } else {
      const { data, error: verifyError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('phone_number', phone_number)
        .eq('code', code)
        .single();

      verificationData = data;

      if (verifyError || !verificationData) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            reason: "De ingevoerde code is onjuist. Probeer het opnieuw."
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if code is expired
      if (new Date(verificationData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            reason: "De code is verlopen. Vraag een nieuwe code aan."
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete used code (only for non-test codes)
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', verificationData.id);
    }

    // Find or create dossier for this phone number
    let { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select('*')
      .eq('phone_number', phone_number)
      .single();

    if (dossierError || !dossier) {
      // Create new dossier
      const { data: newDossier, error: createError } = await supabase
        .from('dossiers')
        .insert({ phone_number })
        .select()
        .single();

      if (createError) {
        console.error('Error creating dossier:', createError);
        return new Response(
          JSON.stringify({ ok: false, reason: "Er is iets misgegaan" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      dossier = newDossier;
    }

    // Generate JWT token
    const jwtSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        phone_number,
        dossier_id: dossier.id,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      },
      key
    );

    console.log(`[SUCCESS] Code verified for ${phone_number}, dossier ID: ${dossier.id}`);

    return new Response(
      JSON.stringify({
        ok: true,
        token,
        dossier_id: dossier.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auth-verify-code:', error);
    return new Response(
      JSON.stringify({ ok: false, reason: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});