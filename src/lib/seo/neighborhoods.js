import { neighborhoodsData } from '@/data/neighborhoodsData';

const SITE_URL = 'https://apartmenthub.nl';

export function buildNeighborhoodMetadata({ slug, locale }) {
    const entry = neighborhoodsData[slug];
    const data = entry?.[locale] ?? entry?.en;

    const canonical = `${SITE_URL}/${locale}/neighborhood/${slug}`;
    const languages = {
        en: `${SITE_URL}/en/neighborhood/${slug}`,
        nl: `${SITE_URL}/nl/neighborhood/${slug}`,
    };

    if (!data) {
        const fallbackTitle =
            locale === 'nl'
                ? 'Buurt in Amsterdam | ApartmentHub'
                : 'Amsterdam Neighborhood | ApartmentHub';
        const fallbackDescription =
            locale === 'nl'
                ? 'Ontdek deze buurt van Amsterdam en vind je perfecte huurappartement met ApartmentHub.'
                : 'Discover this Amsterdam neighborhood and find your perfect rental apartment with ApartmentHub.';
        return {
            title: fallbackTitle,
            description: fallbackDescription,
            alternates: { canonical, languages },
            openGraph: {
                title: fallbackTitle,
                description: fallbackDescription,
                url: canonical,
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: fallbackTitle,
                description: fallbackDescription,
            },
        };
    }

    const neighborhoodName = data.title;
    const title =
        locale === 'nl'
            ? `Huurappartementen in ${neighborhoodName}, Amsterdam | ApartmentHub`
            : `Apartments for Rent in ${neighborhoodName}, Amsterdam | ApartmentHub`;

    const rawDescription = (data.description || '').trim();
    const intro =
        locale === 'nl'
            ? `Huur een appartement in ${neighborhoodName}, Amsterdam. `
            : `Rent an apartment in ${neighborhoodName}, Amsterdam. `;
    const combined = `${intro}${rawDescription}`;
    const description = combined.length > 160 ? `${combined.slice(0, 157).trimEnd()}...` : combined;

    return {
        title,
        description,
        alternates: { canonical, languages },
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: 'ApartmentHub',
            type: 'website',
            locale: locale === 'nl' ? 'nl_NL' : 'en_US',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}
