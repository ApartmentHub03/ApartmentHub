import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Returns the 15 price x bedroom segments with live member counts parsed
// from accounts.tags. Excludes OPT_OUT, ARCHIVED, Rotterdam, Almere.
// Optional ?excludeStudents=true subtracts the "student" tag.

const SEGMENTS = [
    { id: '1500-2000-1', name: 'Customer €1500 · €2000 & 1 Bedroom', minBudget: 1500, maxBudget: 2000, minBedrooms: 1 },
    { id: '1500-2000-2', name: 'Customer €1500 · €2000 & 2 Bedroom', minBudget: 1500, maxBudget: 2000, minBedrooms: 2 },
    { id: '1500-2000-3', name: 'Customer €1500 · €2000 & 3 Bedroom', minBudget: 1500, maxBudget: 2000, minBedrooms: 3 },
    { id: '2000-2500-1', name: 'Customer €2000 · €2500 & 1 Bedroom', minBudget: 2000, maxBudget: 2500, minBedrooms: 1 },
    { id: '2000-2500-2', name: 'Customer €2000 · €2500 & 2 Bedroom', minBudget: 2000, maxBudget: 2500, minBedrooms: 2 },
    { id: '2000-2500-3', name: 'Customer €2000 · €2500 & 3 Bedroom', minBudget: 2000, maxBudget: 2500, minBedrooms: 3 },
    { id: '2500-3000-1', name: 'Customer €2500 · €3000 & 1 Bedroom', minBudget: 2500, maxBudget: 3000, minBedrooms: 1 },
    { id: '2500-3000-2', name: 'Customer €2500 · €3000 & 2 Bedroom', minBudget: 2500, maxBudget: 3000, minBedrooms: 2 },
    { id: '2500-3000-3', name: 'Customer €2500 · €3000 & 3 Bedroom', minBudget: 2500, maxBudget: 3000, minBedrooms: 3 },
    { id: '3000-3500-1', name: 'Customer €3000 · €3500 & 1 Bedroom', minBudget: 3000, maxBudget: 3500, minBedrooms: 1 },
    { id: '3000-3500-2', name: 'Customer €3000 · €3500 & 2 Bedroom', minBudget: 3000, maxBudget: 3500, minBedrooms: 2 },
    { id: '3000-3500-3', name: 'Customer €3000 · €3500 & 3 Bedroom', minBudget: 3000, maxBudget: 3500, minBedrooms: 3 },
    { id: '3500-4000-2', name: 'Customer €3500 · €4000 & 2 Bedroom', minBudget: 3500, maxBudget: 4000, minBedrooms: 2 },
    { id: '3500-4000-3', name: 'Customer €3500 · €4000 & 3 Bedroom', minBudget: 3500, maxBudget: 4000, minBedrooms: 3 },
    { id: '4000-4500-3', name: 'Customer €4000 · €4500 & 3 Bedroom', minBudget: 4000, maxBudget: 4500, minBedrooms: 3 },
];

const EXCLUSION_TAGS = ['OPT_OUT', 'ARCHIVED', 'Rotterdam', 'Almere'];

function parsePriceRange(tag) {
    // Handles "€1250-1500€", "€1500 - €2000", "1500-2000" etc.
    const m = tag.match(/€?(\d+)\s*-\s*€?(\d+)/);
    if (!m) return null;
    return { min: Number(m[1]), max: Number(m[2]) };
}

function parseBedrooms(tag) {
    // Handles "1 Bedroom", "2 Bedrooms", "3 Bedrooms"
    const m = tag.match(/(\d+)\s*Bedroom/);
    if (!m) return null;
    return Number(m[1]);
}

function isExcluded(tags) {
    const lower = tags.map((t) => t.toLowerCase());
    return EXCLUSION_TAGS.some((ex) => lower.includes(ex.toLowerCase()));
}

function isStudent(tags) {
    return tags.some((t) => t.toLowerCase() === 'student');
}

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const url = new URL(request.url);
        const excludeStudents = url.searchParams.get('excludeStudents') === 'true';

        const supabase = serviceClient();
        // Fetch all accounts with tags (limit 5000 to cover the full audience)
        const { data: accounts, error } = await supabase
            .from('accounts')
            .select('id, tags')
            .not('tags', 'is', null)
            .limit(5000);
        if (error) throw error;

        // Build per-segment counts
        const counts = SEGMENTS.map((seg) => {
            let count = 0;
            for (const acc of accounts || []) {
                const tags = acc.tags || [];
                if (tags.length === 0) continue;
                // Exclude OPT_OUT, ARCHIVED, Rotterdam, Almere
                if (isExcluded(tags)) continue;
                // Optional student exclusion
                if (excludeStudents && isStudent(tags)) continue;
                // Check price range overlap
                const priceRanges = tags.map(parsePriceRange).filter(Boolean);
                const inPrice = priceRanges.some(
                    (pr) => seg.minBudget >= pr.min && seg.maxBudget <= pr.max
                );
                if (!inPrice) continue;
                // Check bedroom match
                const bedroomTags = tags.map(parseBedrooms).filter((b) => b !== null);
                const inBedrooms = bedroomTags.length === 0 || bedroomTags.includes(seg.minBedrooms);
                if (!inBedrooms) continue;
                count++;
            }
            return {
                id: seg.id,
                name: seg.name,
                min_budget: seg.minBudget,
                max_budget: seg.maxBudget,
                min_bedrooms: seg.minBedrooms,
                count,
            };
        });

        return NextResponse.json({ success: true, segments: counts });
    } catch (err) {
        return failed('crm/segments GET', err, 'Failed to load segment counts');
    }
}