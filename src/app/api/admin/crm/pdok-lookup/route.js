import { NextResponse } from 'next/server';
import { requirePermission } from '@/services/crmAuth';
import { lookupBagAddress, lookupBuildingDetails } from '@/app/lib/public-registers';

// PDOK address lookup — wraps the existing public-registers integration so the
// CRM client can auto-fill zip code + square meters from a street address.
// No API key needed (PDOK is free). CRM-authed.

export async function POST(request) {
    const auth = await requirePermission(request, 'apartments');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    try {
        const { query } = await request.json();
        if (!query || typeof query !== 'string' || query.trim().length < 5) {
            return NextResponse.json({ success: false, message: 'Address query is required' }, { status: 400 });
        }

        // PDOK free-text search expects "street postcode city" — we just pass
        // whatever the agent typed (usually "Govert Flinckstraat 357-H").
        const validated = await lookupBagAddress(query.trim(), '');
        if (!validated) {
            return NextResponse.json({ success: true, found: false });
        }

        // Also fetch building details (bouwjaar + oppervlakte)
        const building = await lookupBuildingDetails(validated.bagId);

        return NextResponse.json({
            success: true,
            found: true,
            address: {
                straat: validated.straat,
                huisnummer: validated.huisnummer,
                postcode: validated.postcode,
                woonplaats: validated.woonplaats,
                buurt: validated.buurt || null,
                wijk: validated.wijk || null,
                gemeente: validated.gemeente,
            },
            building: {
                bouwjaar: building.bouwjaar || null,
                oppervlakte: building.oppervlakte || null,
            },
        });
    } catch (err) {
        console.error('[crm/pdok-lookup]', err);
        return NextResponse.json({ success: false, message: 'Address lookup failed' }, { status: 500 });
    }
}