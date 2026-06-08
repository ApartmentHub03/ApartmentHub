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
    openGraph: {
        type: 'website',
        siteName: 'ApartmentHub',
        title: 'Amsterdam Apartments for Rent | ApartmentHub - Verified Listings',
        description: 'Find Amsterdam apartments for rent on ApartmentHub. Browse verified listings across the Netherlands, build your rental dossier, and apply online — start your search today.',
        url: 'https://apartmenthub.nl/en',
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Amsterdam Apartments for Rent | ApartmentHub',
        description: 'Find Amsterdam apartments for rent on ApartmentHub. Browse verified listings across the Netherlands and apply online today.',
    },
};

export default function Page() {
    return <Home />;
}
