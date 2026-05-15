import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { neighborhoodsData } from '@/data/neighborhoodsData';

const SITE_URL = 'https://apartmenthub.nl';

function normalizeSlug(raw) {
    if (typeof raw !== 'string') return '';
    const cleaned = raw.replace(/(%EF%BB%BF|%E2%80%8B)+/gi, '');
    const stripZeroWidth = (s) => s.replace(/[​-‍﻿]/g, '').trim().toLowerCase();
    try {
        return stripZeroWidth(decodeURIComponent(cleaned));
    } catch {
        return stripZeroWidth(cleaned);
    }
}

export async function generateMetadata({ params }) {
    const resolved = await params;
    const slug = normalizeSlug(resolved?.id);
    const data = neighborhoodsData[slug]?.en;
    const canonical = `${SITE_URL}/en/neighborhood/${slug}`;
    const nlAlternate = `${SITE_URL}/nl/neighborhood/${slug}`;

    if (!data) {
        return {
            title: 'Amsterdam Neighborhood Guide',
            description:
                "Explore Amsterdam's neighborhoods on ApartmentHub. Find apartments to rent or buy with local market data, livability scores, and expert insights.",
            alternates: {
                canonical: `${SITE_URL}/en/neighborhoods`,
                languages: {
                    en: `${SITE_URL}/en/neighborhoods`,
                    nl: `${SITE_URL}/nl/neighborhoods`,
                },
            },
        };
    }

    const name = data.title;
    const title = `Apartments in ${name}, Amsterdam — Rent & Buy Guide`;
    const description = `Rent or buy an apartment in ${name}, Amsterdam. Compare rental and purchase prices, demand and livability in ${name}. Start your apartment search with ApartmentHub today.`;

    return {
        title,
        description,
        keywords: [
            `${name} Amsterdam`,
            `apartments ${name}`,
            `rent apartment ${name}`,
            `buy apartment ${name}`,
            `${name} rental prices`,
            `${name} neighborhood guide`,
            'Amsterdam apartments',
        ],
        alternates: {
            canonical,
            languages: {
                en: canonical,
                nl: nlAlternate,
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
