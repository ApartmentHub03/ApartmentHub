import DiscoverMore from '@/pages/DiscoverMore';

export const metadata = {
    title: 'Discover More About Renting in Amsterdam | ApartmentHub',
    description: 'Explore guides, tips, and insights about renting apartments in Amsterdam.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/discover-more',
        languages: {
            en: 'https://www.apartmenthub.nl/en/discover-more',
            nl: 'https://www.apartmenthub.nl/nl/discover-more',
        },
    },
};

export default function Page() {
    return <DiscoverMore />;
}
