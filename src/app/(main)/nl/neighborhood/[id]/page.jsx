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
    const data = neighborhoodsData[id]?.nl || neighborhoodsData[id]?.en;

    if (!data) {
        return {
            title: 'Wijken in Amsterdam | Appartementen te huur',
            description:
                'Ontdek wijken in Amsterdam zoals Centrum, Jordaan, Noord, Oost, Zeeburg en Zuidas. Vind appartementen te huur met lokale marktdata en leefbaarheidsscores.',
            alternates: {
                canonical: `${BASE_URL}/nl/neighborhoods`,
                languages: {
                    en: `${BASE_URL}/en/neighborhoods`,
                    nl: `${BASE_URL}/nl/neighborhoods`,
                },
            },
        };
    }

    const title = `Appartementen te huur in ${data.title}, Amsterdam | Huurprijzen & Leefbaarheid`;
    const summary = data.description?.split('. ')[0] || `${data.title} is een wijk in Amsterdam.`;
    const description = truncate(
        `${summary}. Bekijk huurprijzen, markttrends, demografie en leefbaarheidsscores voor ${data.title}, Amsterdam.`,
        160,
    );
    const url = `${BASE_URL}/nl/neighborhood/${id}`;

    return {
        title,
        description,
        alternates: {
            canonical: url,
            languages: {
                en: `${BASE_URL}/en/neighborhood/${id}`,
                nl: url,
            },
        },
        openGraph: {
            title,
            description,
            url,
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
