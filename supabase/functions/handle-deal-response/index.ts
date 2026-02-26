import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { apartment_id, phone_number, response } = await req.json();

        // Validate inputs
        if (!apartment_id || !phone_number || !response) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    message: "Missing required fields: apartment_id, phone_number, response",
                    message_nl: "Ontbrekende verplichte velden"
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const normalizedResponse = response.toLowerCase().trim();
        if (!['accept', 'decline'].includes(normalizedResponse)) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    message: "Response must be 'accept' or 'decline'",
                    message_nl: "Reactie moet 'accept' of 'decline' zijn"
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const newStatus = normalizedResponse === 'accept' ? 'DEAL_ACCEPTED' : 'OFFER_DECLINED';

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Format phone for matching
        let formattedPhone = phone_number.replace(/[^\d+]/g, '');
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        // Fetch the apartment
        const { data: apartment, error: aptError } = await supabase
            .from('apartments')
            .select('id, name, offers_sent')
            .eq('id', apartment_id)
            .single();

        if (aptError || !apartment) {
            console.error('Apartment not found:', apartment_id, aptError);
            return new Response(
                JSON.stringify({
                    ok: false,
                    message: "Apartment not found",
                    message_nl: "Appartement niet gevonden"
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const offersSent = apartment.offers_sent || [];

        // Find the matching offer by phone number
        // Normalize both sides for matching
        const normalizeForMatch = (phone: string): string => {
            const digits = phone.replace(/\D/g, '');
            return digits.length > 9 ? digits.slice(-9) : digits;
        };

        const phoneNorm = normalizeForMatch(formattedPhone);
        let matchIdx = -1;

        for (let i = 0; i < offersSent.length; i++) {
            const offerPhone = offersSent[i].whatsapp_number || offersSent[i].phone_number || '';
            if (normalizeForMatch(offerPhone) === phoneNorm) {
                matchIdx = i;
                break;
            }
        }

        if (matchIdx === -1) {
            console.error('No matching offer found for phone:', formattedPhone, 'in apartment:', apartment_id);
            return new Response(
                JSON.stringify({
                    ok: false,
                    message: "No offer found for this phone number on this apartment",
                    message_nl: "Geen aanbod gevonden voor dit telefoonnummer bij dit appartement"
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if already responded
        const currentStatus = (offersSent[matchIdx].status || '').toUpperCase().trim();
        if (currentStatus === 'DEAL_ACCEPTED' || currentStatus === 'OFFER_DECLINED') {
            return new Response(
                JSON.stringify({
                    ok: false,
                    message: `This offer has already been ${currentStatus === 'DEAL_ACCEPTED' ? 'accepted' : 'declined'}`,
                    message_nl: `Dit aanbod is al ${currentStatus === 'DEAL_ACCEPTED' ? 'geaccepteerd' : 'afgewezen'}`
                }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Update the offer status
        offersSent[matchIdx] = {
            ...offersSent[matchIdx],
            status: newStatus,
            responded_at: new Date().toISOString()
        };

        // Update apartments.offers_sent — this triggers the DB trigger
        const { error: updateError } = await supabase
            .from('apartments')
            .update({ offers_sent: offersSent })
            .eq('id', apartment_id);

        if (updateError) {
            console.error('Error updating offers_sent:', updateError);
            return new Response(
                JSON.stringify({
                    ok: false,
                    message: "Failed to process your response. Please try again.",
                    message_nl: "Kon je reactie niet verwerken. Probeer het opnieuw."
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[SUCCESS] Deal response processed: ${newStatus} for apartment ${apartment_id}, phone ${formattedPhone}`);

        return new Response(
            JSON.stringify({
                ok: true,
                status: newStatus,
                message: normalizedResponse === 'accept'
                    ? "Deal accepted! We will contact you shortly with next steps."
                    : "Offer declined. Thank you for your response.",
                message_nl: normalizedResponse === 'accept'
                    ? "Deal geaccepteerd! We nemen snel contact met je op voor de volgende stappen."
                    : "Aanbod afgewezen. Bedankt voor je reactie.",
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error in handle-deal-response:', errorMessage);
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
