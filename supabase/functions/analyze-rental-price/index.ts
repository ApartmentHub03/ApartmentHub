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
    const { address, postalCode, squareMeters, rooms, interior, condition } = await req.json();
    
    console.log('Analyzing rental price for:', { address, postalCode, squareMeters, rooms, interior, condition });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use AI to analyze the Amsterdam rental market for this property
    const systemPrompt = `Je bent een expert in de Amsterdamse huurmarkt. Bereken EXACT volgens deze stappen de huurprijs.

STAP 1 - BEPAAL BASIS HUURPRIJS:
Gebruik deze EXACTE prijzen per m² per wijk (2025):
- Centrum: €25.50/m² (postcode 1012-1019)
- Jordaan: €23.80/m² (postcode 1015-1017)
- Zuid: €24.65/m² (postcode 1071-1077)
- De Pijp: €22.10/m² (postcode 1072-1075)
- Oost: €21.25/m² (postcode 1091-1098)
- Noord: €18.70/m² (postcode 1031-1039)
- Nieuw-West: €17.85/m² (postcode 1055-1069)

Basis = (oppervlakte × prijs_per_m²) + (kamers × €100 kamer_bonus)

STAP 2 - PAS INTERIEUR AANPASSING TOE:
- shell: Basis × 0.82 (BASIS - 18%)
- unfurnished: Basis × 1.00 (geen aanpassing)
- partlyFurnished: Basis × 1.08 (BASIS + 8%)
- furnished: Basis × 1.20 (BASIS + 20%)

STAP 3 - PAS STAAT AANPASSING TOE OP RESULTAAT VAN STAP 2:
- brandNew: (Basis na interieur) × 1.12 (+ 12%)
- average: (Basis na interieur) × 1.00 (geen aanpassing)
- belowAverage: (Basis na interieur) × 0.88 (- 12%)

VOORBEELDEN TER VERIFICATIE:
1. 80m², De Pijp (€22.10/m²), 3 kamers, furnished, average:
   - Basis: (80 × 22.10) + (3 × 100) = €2,068
   - Na interieur (+20%): €2,068 × 1.20 = €2,482
   - Na staat (0%): €2,482 × 1.00 = €2,482
   
2. 126m², Zuid (€24.65/m²), 3 kamers, furnished, brandNew:
   - Basis: (126 × 24.65) + (3 × 100) = €3,406
   - Na interieur (+20%): €3,406 × 1.20 = €4,087
   - Na staat (+12%): €4,087 × 1.12 = €4,577

3. 50m², Centrum (€25.50/m²), 1 kamer, shell, belowAverage:
   - Basis: (50 × 25.50) + (1 × 100) = €1,375
   - Na interieur (-18%): €1,375 × 0.82 = €1,128
   - Na staat (-12%): €1,128 × 0.88 = €993

Retourneer ALLEEN JSON (geen markdown, geen extra tekst):
{
  "estimatedRent": [eindresultaat na stap 3, afgerond],
  "baseRent": [basis uit stap 1],
  "locationBonus": [kamers × 100],
  "optimization": [verschil tussen estimatedRent en baseRent],
  "neighborhood": "[wijknaam]",
  "pricePerSqm": [gebruikte prijs per m²]
}`;

    const userPrompt = `Analyseer de huurprijs voor:
- Adres: ${address}
- Postcode: ${postalCode}
- Oppervlakte: ${squareMeters}m²
- Kamers: ${rooms}
- Interieur: ${interior}
- Staat: ${condition}

Geef een realistische marktconforme huurprijs voor 2025.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse the JSON response from AI
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    console.log('Parsed analysis:', analysis);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-rental-price function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        estimatedRent: 0
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
