import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dossier_id, role, name, linked_to_persoon_id, auth_token: bodyToken } = await req.json();

    if (!dossier_id || !role) {
      return new Response(
        JSON.stringify({ ok: false, message: 'dossier_id and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['Medehuurder', 'Garantsteller'].includes(role)) {
      return new Response(
        JSON.stringify({ ok: false, message: 'role must be Medehuurder or Garantsteller' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller's auth token (from body or header)
    const authToken = bodyToken || req.headers.get('x-auth-token');
    if (!authToken) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    // Verify caller's token
    try {
      await verify(authToken, key);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, message: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invite token (valid for 14 days)
    const inviteToken = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        type: 'invite',
        dossier_id,
        role,
        name: name || null,
        linked_to_persoon_id: linked_to_persoon_id || null,
        exp: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
      },
      key
    );

    console.log(`[generate-invite] Created invite for dossier ${dossier_id}, role: ${role}`);

    return new Response(
      JSON.stringify({
        ok: true,
        invite_token: inviteToken,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-invite] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
