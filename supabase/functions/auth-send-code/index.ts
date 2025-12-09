import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number } = await req.json();

    if (!phone_number || phone_number.length < 10) {
      return new Response(
        JSON.stringify({ ok: false, message: "Voer een geldig telefoonnummer in" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit code (use test code for development)
    const code = '123456'; // TODO: Use random code in production
    
    // Store code in database with 10 minute expiry
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete old codes for this phone number
    await supabase
      .from('verification_codes')
      .delete()
      .eq('phone_number', phone_number);

    // Insert new code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const { error } = await supabase
      .from('verification_codes')
      .insert({
        phone_number,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error('Error storing verification code:', error);
      return new Response(
        JSON.stringify({ ok: false, message: "Er is iets misgegaan" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Send WhatsApp message with code (mock for now)
    console.log(`[MOCK] Sending WhatsApp code ${code} to ${phone_number}`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "We hebben je een verificatiecode gestuurd via WhatsApp"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auth-send-code:', error);
    return new Response(
      JSON.stringify({ ok: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});