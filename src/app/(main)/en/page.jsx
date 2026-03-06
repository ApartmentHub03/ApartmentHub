import Home from '@/pages/Home';

export const metadata = {
    title: 'ApartmentHub - Find Your Perfect Apartment in Amsterdam',
    description: 'Find your perfect rental apartment in Amsterdam with ApartmentHub. Browse listings, apply online, and move in hassle-free.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en',
        languages: {
            en: 'https://www.apartmenthub.nl/en',
            nl: 'https://www.apartmenthub.nl/nl',
        },
    },
};

export default function Page() {
    return <Home />;
}
