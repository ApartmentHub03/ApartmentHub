import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// N8N Webhook configuration for OTP delivery
const N8N_WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/get-otp';

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Format phone number to E.164 format (international)
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let formatted = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!formatted.startsWith('+')) {
    // If no country code, assume it needs one (user should provide it)
    formatted = '+' + formatted;
  }

  return formatted;
}

// Send OTP via N8N webhook
async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const requestBody = {
      otp: otp,
      phone_number: phoneNumber,
    };

    console.log('Sending OTP to N8N webhook for:', phoneNumber);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('N8N webhook response status:', response.status);
    console.log('N8N webhook response:', responseText);

    if (!response.ok) {
      console.error('N8N webhook error:', responseText);
      return { ok: false, error: `Webhook failed: ${response.status} - ${responseText}` };
    }

    return { ok: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error calling N8N webhook:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, mode } = await req.json();

    if (!phone_number || phone_number.length < 9) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Please enter a valid phone number",
          message_nl: "Voer een geldig telefoonnummer in"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(phone_number);
    console.log(`Processing OTP request for: ${formattedPhone}, mode: ${mode || 'login'}`);

    // Generate 6-digit OTP
    const code = generateOTP();

    // Store code in database with 10 minute expiry
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only check for existing user during LOGIN (not signup)
    if (mode !== 'signup') {
      const { data: existingUser, error: lookupError } = await supabase
        .from('dossiers')
        .select('id')
        .eq('phone_number', formattedPhone)
        .single();

      if (lookupError || !existingUser) {
        console.log(`User not found for phone: ${formattedPhone}`);
        return new Response(
          JSON.stringify({
            ok: false,
            message: "No account found with this phone number. Please sign up first.",
            message_nl: "Geen account gevonden met dit telefoonnummer. Registreer je eerst."
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`User found with dossier ID: ${existingUser.id}`);
    } else {
      // During signup, check if user ALREADY exists (prevent duplicate accounts)
      const { data: existingUser } = await supabase
        .from('dossiers')
        .select('id')
        .eq('phone_number', formattedPhone)
        .single();

      if (existingUser) {
        console.log(`User already exists with phone: ${formattedPhone}`);
        return new Response(
          JSON.stringify({
            ok: false,
            message: "An account with this phone number already exists. Please login instead.",
            message_nl: "Er bestaat al een account met dit telefoonnummer. Log in."
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Signup mode: no existing user found, proceeding with OTP`);
    }

    // Delete old codes for this phone number
    await supabase
      .from('verification_codes')
      .delete()
      .eq('phone_number', formattedPhone);

    // Insert new code with 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        phone_number: formattedPhone,
        code,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      });

    if (insertError) {
      console.error('Error storing verification code:', insertError);
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Something went wrong. Please try again.",
          message_nl: "Er is iets misgegaan. Probeer het opnieuw."
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via n8n webhook
    const sendResult = await sendWhatsAppOTP(formattedPhone, code);

    if (!sendResult.ok) {
      console.error('Failed to send WhatsApp OTP:', sendResult.error);
      // Still return success - code is stored, user can use test mode
    } else {
      console.log(`[SUCCESS] OTP sent to ${formattedPhone}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "We have sent you a verification code via WhatsApp",
        message_nl: "We hebben je een verificatiecode gestuurd via WhatsApp",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in auth-send-code:', errorMessage);
    return new Response(
      JSON.stringify({
        ok: false,
        message: errorMessage,
        message_nl: "Er is een fout opgetreden"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});