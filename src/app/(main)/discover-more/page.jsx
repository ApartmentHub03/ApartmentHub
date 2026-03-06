import DiscoverMore from '@/pages/DiscoverMore';

export const metadata = {
    title: 'Discover More About Renting in Amsterdam | ApartmentHub',
    description: 'Discover more about the Amsterdam rental market and how ApartmentHub can help you find your next home.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/discover-more',
        languages: {
            en: 'https://apartmenthub.nl/en/discover-more',
            nl: 'https://apartmenthub.nl/nl/discover-more',
        },
    },
};

export default function Page() {
    return <DiscoverMore />;
}
