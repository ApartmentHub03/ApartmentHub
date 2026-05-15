import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { neighborhoodsData } from '@/data/neighborhoodsData';

const BASE_URL = 'https://apartmenthub.nl';
const ZERO_WIDTH = /[​-‍﻿]/g;

function normalizeId(rawId) {
    if (typeof rawId !== 'string') return '';
    const cleaned = rawId.replace(/(%EF%BB%BF|%E2%80%8B)+/gi, '');
    try {
        return decodeURIComponent(cleaned).replace(ZERO_WIDTH, '').trim();
    } catch {
        return cleaned.replace(ZERO_WIDTH, '').trim();
    }
}

function truncate(text, max) {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const id = normalizeId(resolvedParams?.id);
    const data = neighborhoodsData[id]?.en;

    if (!data) {
        return {
            title: 'Amsterdam Neighborhoods | Apartments for Rent',
            description:
                'Explore Amsterdam neighborhoods including Centrum, Jordaan, Noord, Oost, Zeeburg and Zuidas. Find apartments for rent with local market data and livability scores.',
            alternates: {
                canonical: `${BASE_URL}/en/neighborhoods`,
                languages: {
                    en: `${BASE_URL}/en/neighborhoods`,
                    nl: `${BASE_URL}/nl/neighborhoods`,
                },
            },
        };
    }

    const title = `Apartments for Rent in ${data.title}, Amsterdam | Rental Prices & Livability`;
    const summary = data.description?.split('. ')[0] || `${data.title} is a neighborhood in Amsterdam.`;
    const description = truncate(
        `${summary}. See rental prices, market trends, demographics and livability scores for ${data.title}, Amsterdam.`,
        160,
    );
    const url = `${BASE_URL}/en/neighborhood/${id}`;

    return {
        title,
        description,
        alternates: {
            canonical: url,
            languages: {
                en: url,
                nl: `${BASE_URL}/nl/neighborhood/${id}`,
            },
        },
        openGraph: {
            title,
            description,
            url,
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
