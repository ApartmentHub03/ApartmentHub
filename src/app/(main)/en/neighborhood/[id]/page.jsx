import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { neighborhoodsData } from '@/data/neighborhoodsData';

const SITE_URL = 'https://www.apartmenthub.nl';

export async function generateMetadata({ params }) {
    const { id } = await params;
    const data = neighborhoodsData[id]?.en;

    if (!data) {
        return {
            title: 'Neighborhood Not Found',
            description: 'The requested Amsterdam neighborhood guide could not be found on ApartmentHub.',
            alternates: {
                canonical: `${SITE_URL}/en/neighborhood/${id}`,
                languages: {
                    en: `${SITE_URL}/en/neighborhood/${id}`,
                    nl: `${SITE_URL}/nl/neighborhood/${id}`,
                },
            },
        };
    }

    const landmark = Array.isArray(data.highlights) && data.highlights.length > 0
        ? data.highlights[0].split(' - ')[0].split(' (')[0]
        : null;
    const studioRent = data.marketData?.rentalPrices?.find((p) => /studio/i.test(p.name))?.price;

    const title = `Rent an Apartment in ${data.title}, Amsterdam | Rentals, Prices & Area Guide`;
    const descBase = data.description.length > 140
        ? `${data.description.slice(0, 137).trimEnd()}...`
        : data.description;
    const descExtras = [
        landmark ? `Near ${landmark}.` : null,
        studioRent ? `Studios from €${studioRent}/mo.` : null,
        'See listings & local insights on ApartmentHub.',
    ].filter(Boolean).join(' ');
    const description = `${descBase} ${descExtras}`.trim().slice(0, 300);

    const canonical = `${SITE_URL}/en/neighborhood/${id}`;

    return {
        title,
        description,
        keywords: [
            `apartments ${data.title}`,
            `rent ${data.title} Amsterdam`,
            `${data.title} apartments for rent`,
            `living in ${data.title}`,
            `${data.title} neighborhood guide`,
        ],
        alternates: {
            canonical,
            languages: {
                en: canonical,
                nl: `${SITE_URL}/nl/neighborhood/${id}`,
            },
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'article',
            locale: 'en_US',
            siteName: 'ApartmentHub',
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
