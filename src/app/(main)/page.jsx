import Home from '@/pages/Home';

export const metadata = {
    title: 'Amsterdam Apartments for Rent | ApartmentHub - Verified Listings',
    description: 'Find Amsterdam apartments for rent on ApartmentHub. Browse verified listings across the Netherlands, build your rental dossier, and apply online — start your search today.',
    keywords: ['amsterdam apartments for rent', 'apartments for rent in amsterdam', 'amsterdam rental apartments', 'rent apartment amsterdam', 'apartment rental netherlands'],
    alternates: {
        canonical: 'https://apartmenthub.nl/en',
        languages: {
            en: 'https://apartmenthub.nl/en',
            nl: 'https://apartmenthub.nl/nl',
        },
    },
};

export default function Page() {
    return <Home />;
}
