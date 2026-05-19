// Zoko WhatsApp Business API — minimal client for OTP template send.
// Endpoint: POST https://chat.zoko.io/v2/message ; Auth: `apikey: <ZOKO_API_KEY>`.
// If ZOKO_API_KEY is empty, the code is logged and returned in the response (dev mode).

type SendOtpResult = {
  ok: boolean;
  delivered: boolean;
  devCode?: string;
  error?: string;
};

export async function sendOtpViaZoko(
  phoneE164: string,
  code: string
): Promise<SendOtpResult> {
  // Prefer the verkoop-specific Zoko template (otp_verification) so we don't
  // accidentally fall back to the rental app's ZOKO_TEMPLATE_NAME, which has
  // a different body schema and will fail with a Zoko 4xx.
  const apiKey = process.env.VERKOOP_ZOKO_API_KEY ?? process.env.ZOKO_API_KEY;
  const templateName =
    process.env.VERKOOP_ZOKO_TEMPLATE_NAME ?? process.env.ZOKO_TEMPLATE_NAME;

  if (!apiKey || !templateName) {
    console.warn(
      `[zoko] keys missing — falling back to console. ` +
        `phone=${phoneE164} code=${code}`
    );
    return { ok: true, delivered: false, devCode: code };
  }

  const body = {
    channel: "whatsapp",
    recipient: phoneE164.replace(/^\+/, ""),
    type: "buttonTemplate",
    templateId: templateName,
    templateLanguage: "en_US",
    templateArgs: [code, code],
  };

  try {
    const res = await fetch("https://chat.zoko.io/v2/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        ok: false,
        delivered: false,
        error: `zoko ${res.status}: ${txt.slice(0, 200)}`,
      };
    }
    return { ok: true, delivered: true };
  } catch (err) {
    return {
      ok: false,
      delivered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
