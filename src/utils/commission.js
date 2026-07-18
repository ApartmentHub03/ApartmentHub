/**
 * Commission calculation for ApartmentHub rental deals.
 *
 * Rule (from TermsAndConditions §203-209):
 *   - Default: 1 month rent ex-VAT
 *   - If rent < EUR 2,000/month: 2 months rent ex-VAT (unless overridden)
 *   - Per-apartment override: apartments.commission_months
 *   - VAT: 21% (BTW)
 */

const DEFAULT_VAT_RATE = 0.21;
const LOW_RENT_THRESHOLD = 2000;

/**
 * Calculate commission for a rental deal.
 *
 * @param rentPrice     - The monthly rent (final rent price if negotiated, else apartment.rental_price)
 * @param overrideMonths - Optional per-apartment override (apartments.commission_months). null = auto.
 * @returns { months, amountExVat, vatRate, vatAmount, amountIncVat }
 */
export function calculateCommission(rentPrice, overrideMonths = null) {
    const rent = Number(rentPrice) || 0;
    const months = overrideMonths != null
        ? Math.max(1, Math.round(overrideMonths))
        : rent < LOW_RENT_THRESHOLD
            ? 2
            : 1;

    const amountExVat = rent * months;
    const vatRate = DEFAULT_VAT_RATE;
    const vatAmount = Math.round(amountExVat * vatRate * 100) / 100;
    const amountIncVat = Math.round((amountExVat + vatAmount) * 100) / 100;

    return { months, amountExVat, vatRate, vatAmount, amountIncVat };
}

export { DEFAULT_VAT_RATE, LOW_RENT_THRESHOLD };