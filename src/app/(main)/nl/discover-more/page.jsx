import DiscoverMore from '@/pages/DiscoverMore';

export const metadata = {
    title: 'Ontdek Meer Over Huren in Amsterdam | ApartmentHub',
    description: 'Verken gidsen, tips en inzichten over het huren van appartementen in Amsterdam.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/discover-more',
        languages: {
            en: 'https://apartmenthub.nl/en/discover-more',
            nl: 'https://apartmenthub.nl/nl/discover-more',
        },
    },
};

export default function Page() {
    return <DiscoverMore />;
}
