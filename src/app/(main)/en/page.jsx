import Home from '@/pages/Home';

export const metadata = {
    title: 'ApartmentHub - Find Your Perfect Apartment in Amsterdam',
    description: 'Find your perfect rental apartment in Amsterdam with ApartmentHub. Browse listings, apply online, and move in hassle-free.',
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
