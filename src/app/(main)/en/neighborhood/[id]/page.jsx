import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { neighborhoodsData } from '@/data/neighborhoodsData';

const SITE_URL = 'https://apartmenthub.nl';

const FALLBACK_DESCRIPTIONS = {
    centrum: "Find apartments for rent in Amsterdam Centrum. Explore the historic canal ring, top attractions and current rental prices in the city's beating heart.",
    noord: 'Find apartments for rent in Amsterdam Noord. Discover NDSM, EYE Film Museum and the creative, waterfront character of the north.',
    jordaan: 'Find apartments for rent in Jordaan, Amsterdam. Browse rentals among the narrow streets, hidden hofjes and iconic cafés of this beloved neighborhood.',
    oost: 'Find apartments for rent in Amsterdam Oost. Green Oosterpark, diverse food and a relaxed, family-friendly vibe close to the center.',
    zeeburg: 'Find apartments for rent in Zeeburg, Amsterdam. Waterfront living near the IJ with characteristic architecture and easy city access.',
    zuidas: 'Find apartments for rent in Zuidas, Amsterdam. Modern high-rise living in the international business district with excellent transport links.',
    'de-pijp': "Find apartments for rent in De Pijp, Amsterdam. Live near the Albert Cuyp Market in one of the city's most vibrant, foodie neighborhoods.",
    'oud-zuid': 'Find apartments for rent in Oud-Zuid, Amsterdam. Elegant streets near Vondelpark, Museumplein and P.C. Hooftstraat luxury shopping.',
    'nieuw-west': 'Find apartments for rent in Nieuw-West, Amsterdam. Spacious, green living around Sloterplas with affordable options and great connections.',
};

export async function generateMetadata({ params }) {
    const { id: rawId } = await params;
    const slug = decodeURIComponent(rawId || '').trim();
    const data = neighborhoodsData[slug]?.en;
    const canonical = `${SITE_URL}/en/neighborhood/${slug}`;

    if (!data) {
        return {
            title: 'Amsterdam Neighborhood | ApartmentHub',
            description: "Discover Amsterdam's neighborhoods and find apartments for rent with ApartmentHub.",
            alternates: { canonical },
        };
    }

    const title = `Apartments for Rent in ${data.title}, Amsterdam | ApartmentHub`;
    const description = FALLBACK_DESCRIPTIONS[slug] || `Apartments for rent in ${data.title}, Amsterdam. ${data.description}`;

    return {
        title,
        description,
        alternates: {
            canonical,
            languages: {
                en: `${SITE_URL}/en/neighborhood/${slug}`,
                nl: `${SITE_URL}/nl/neighborhood/${slug}`,
            },
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

export default function Page() {
    return <NeighborhoodDetail />;
}
