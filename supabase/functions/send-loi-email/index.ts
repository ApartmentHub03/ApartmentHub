import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LOIEmailRequest {
  recipientEmail: string;
  recipientName: string;
  propertyAddress: string;
  bidAmount: number;
  startDate: string;
  monthsAdvance?: number;
  signatureDataUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      propertyAddress,
      bidAmount,
      startDate,
      monthsAdvance = 0,
      signatureDataUrl
    }: LOIEmailRequest = await req.json();

    console.log('Sending LOI email to:', recipientEmail);

    if (!recipientEmail || !recipientName) {
      throw new Error('Missing required fields: recipientEmail or recipientName');
    }

    const emailResponse = await resend.emails.send({
      from: "ApartmentHub <onboarding@resend.dev>", // Change to your verified domain
      to: [recipientEmail],
      subject: "Je Letter of Intent - ApartmentHub",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #497772; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Letter of Intent Bevestiging</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
            <p style="font-size: 16px; color: #333;">Beste ${recipientName},</p>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Je Letter of Intent is succesvol ondertekend en ingediend. Hieronder vind je een samenvatting van je aanvraag:
            </p>
            
            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h2 style="color: #497772; font-size: 18px; margin-top: 0;">📋 Aanvraaggegevens</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Adres:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${propertyAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Huurprijs:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">€${bidAmount} per maand</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Gewenste startdatum:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${startDate}</td>
                </tr>
                ${monthsAdvance > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Maanden vooruit:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${monthsAdvance} maanden</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Ondertekend op:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin: 25px 0;">
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;"><strong>Je handtekening:</strong></p>
              <div style="border: 2px dashed #497772; border-radius: 8px; padding: 15px; background: #f9f9f9; text-align: center;">
                <img src="${signatureDataUrl}" alt="Handtekening" style="max-width: 300px; max-height: 150px; display: inline-block;" />
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                ⏱️ <strong>Reactietijd:</strong> We nemen binnen 7 werkdagen contact met je op over de status van je aanvraag.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 25px;">
              Heb je vragen? Neem gerust contact met ons op via WhatsApp of email.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Met vriendelijke groet,<br/>
              <strong style="color: #497772;">Team ApartmentHub</strong>
            </p>
          </div>
          
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} ApartmentHub. Alle rechten voorbehouden.
            </p>
          </div>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending LOI email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
