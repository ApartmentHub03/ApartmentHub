import DiscoverMore from '@/pages/DiscoverMore';

export const metadata = {
    title: 'Ontdek Meer Over Huren in Amsterdam | ApartmentHub',
    description: 'Verken gidsen, tips en inzichten over het huren van appartementen in Amsterdam.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/discover-more',
        languages: {
            en: 'https://www.apartmenthub.nl/en/discover-more',
            nl: 'https://www.apartmenthub.nl/nl/discover-more',
        },
    },
};

export default function Page() {
    return <DiscoverMore />;
}
