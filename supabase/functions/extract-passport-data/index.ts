import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, fileType } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PASSPORT EXTRACT] Starting AI analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Je bent een AI assistent die Nederlandse identiteitsdocumenten (paspoorten en ID-kaarten) analyseert. Extraheer alleen de gevraagde informatie in het juiste formaat.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyseer dit Nederlandse identiteitsdocument (paspoort of ID-kaart) en extraheer de volgende gegevens:\n1. Geboortedatum in formaat DD-MM-YYYY\n2. Documentnummer (dit kan een paspoortnummer of ID-kaartnummer zijn)\n\nGeef je antwoord ALLEEN als JSON in dit exacte formaat:\n{\n  "geboortedatum": "DD-MM-YYYY",\n  "paspoortnummer": "documentnummer"\n}\n\nGeef geen uitleg, alleen de JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${fileType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PASSPORT EXTRACT] AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('[PASSPORT EXTRACT] No AI response');
      return new Response(
        JSON.stringify({ success: false, error: "No data extracted" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PASSPORT EXTRACT] AI raw response:', aiResponse);

    // Parse JSON from AI response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[PASSPORT EXTRACT] JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not parse extracted data" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PASSPORT EXTRACT] Success:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          geboortedatum: extractedData.geboortedatum || null,
          paspoortnummer: extractedData.paspoortnummer || null,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PASSPORT EXTRACT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
