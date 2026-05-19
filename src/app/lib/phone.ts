// Phone normalization to E.164.
// Supports Dutch defaults (06... → +316...) and explicit international input.

export function normalizePhone(input: string): string | null {
  if (!input) return null;
  let s = input.replace(/[\s\-().]/g, "");
  if (!s) return null;

  if (/^\+\d{8,15}$/.test(s)) return s;

  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^\+\d{8,15}$/.test(s)) return s;

  if (/^0\d{9}$/.test(s)) return "+31" + s.slice(1);

  if (/^6\d{8}$/.test(s)) return "+31" + s;

  return null;
}

export function maskPhone(e164: string): string {
  if (!e164.startsWith("+")) return e164;
  const tail = e164.slice(-2);
  const head = e164.slice(0, 5);
  const mid = e164.slice(5, -2).replace(/\d/g, "•");
  return `${head} ${mid} ${tail}`;
}
