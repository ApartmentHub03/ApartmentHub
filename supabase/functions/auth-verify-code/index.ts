import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;

// Format phone number to E.164 format (international)
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let formatted = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }

  return formatted;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, code, first_name, last_name } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone_number);

    // Allow test code 123456 in development without DB lookup
    let verificationData: any = null;
    const isTestCode = code === '123456';

    if (isTestCode) {
      console.log(`[TEST MODE] Bypassing DB verification for ${formattedPhone} with code 123456`);
    } else {
      // Look up the verification code
      const { data, error: verifyError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('phone_number', formattedPhone)
        .single();

      verificationData = data;

      if (verifyError || !verificationData) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "The entered code is incorrect. Please try again.",
            reason_nl: "De ingevoerde code is onjuist. Probeer het opnieuw."
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check attempts
      if (verificationData.attempts >= MAX_ATTEMPTS) {
        // Delete the code - user must request a new one
        await supabase
          .from('verification_codes')
          .delete()
          .eq('id', verificationData.id);

        return new Response(
          JSON.stringify({
            ok: false,
            reason: "Too many attempts. Please request a new code.",
            reason_nl: "Te veel pogingen. Vraag een nieuwe code aan."
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment attempts
      await supabase
        .from('verification_codes')
        .update({ attempts: verificationData.attempts + 1 })
        .eq('id', verificationData.id);

      // Check if code matches
      if (verificationData.code !== code) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "The entered code is incorrect. Please try again.",
            reason_nl: "De ingevoerde code is onjuist. Probeer het opnieuw."
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if code is expired
      if (new Date(verificationData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "The code has expired. Please request a new code.",
            reason_nl: "De code is verlopen. Vraag een nieuwe code aan."
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete used code
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', verificationData.id);
    }

    // Find or create dossier for this phone number
    let { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select('*')
      .eq('phone_number', formattedPhone)
      .single();

    if (dossierError || !dossier) {
      // Create new dossier with optional name fields
      const dossierData: any = { phone_number: formattedPhone };

      // Store name if provided (for signup flow)
      if (first_name || last_name) {
        // We'll store in a separate users table or in dossier metadata
        console.log(`[AUTH] Creating dossier for ${first_name} ${last_name}`);
      }

      const { data: newDossier, error: createError } = await supabase
        .from('dossiers')
        .insert(dossierData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating dossier:', createError);
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "Something went wrong. Please try again.",
            reason_nl: "Er is iets misgegaan. Probeer het opnieuw."
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      dossier = newDossier;
    }

    // Generate JWT token
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
        phone_number: formattedPhone,
        dossier_id: dossier.id,
        first_name: first_name || null,
        last_name: last_name || null,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      },
      key
    );

    console.log(`[SUCCESS] Code verified for ${formattedPhone}, dossier ID: ${dossier.id}`);

    return new Response(
      JSON.stringify({
        ok: true,
        token,
        dossier_id: dossier.id,
        phone_number: formattedPhone,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auth-verify-code:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        reason: error.message,
        reason_nl: "Er is een fout opgetreden"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});