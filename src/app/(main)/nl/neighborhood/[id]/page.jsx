import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { neighborhoodsData } from '@/data/neighborhoodsData';

const SITE_URL = 'https://www.apartmenthub.nl';

export async function generateMetadata({ params }) {
    const { id } = await params;
    const data = neighborhoodsData[id]?.nl;

    if (!data) {
        return {
            title: 'Wijk niet gevonden',
            description: 'De opgevraagde wijkgids voor Amsterdam is niet gevonden op ApartmentHub.',
            alternates: {
                canonical: `${SITE_URL}/nl/neighborhood/${id}`,
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

    const title = `Appartement Huren in ${data.title}, Amsterdam | Huurprijzen & Buurtgids`;
    const descBase = data.description.length > 140
        ? `${data.description.slice(0, 137).trimEnd()}...`
        : data.description;
    const descExtras = [
        landmark ? `Vlakbij ${landmark}.` : null,
        studioRent ? `Studio's vanaf €${studioRent}/mnd.` : null,
        'Bekijk aanbod en lokale inzichten op ApartmentHub.',
    ].filter(Boolean).join(' ');
    const description = `${descBase} ${descExtras}`.trim().slice(0, 300);

    const canonical = `${SITE_URL}/nl/neighborhood/${id}`;

    return {
        title,
        description,
        keywords: [
            `appartementen ${data.title}`,
            `huren ${data.title} Amsterdam`,
            `${data.title} appartement te huur`,
            `wonen in ${data.title}`,
            `${data.title} buurtgids`,
        ],
        alternates: {
            canonical,
            languages: {
                en: `${SITE_URL}/en/neighborhood/${id}`,
                nl: canonical,
            },
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'article',
            locale: 'nl_NL',
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
