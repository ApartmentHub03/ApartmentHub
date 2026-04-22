import Home from '@/pages/Home';

export const metadata = {
    title: 'ApartmentHub - Find Your Perfect Apartment in Amsterdam',
    description: 'Browse verified rental listings across the Netherlands with ApartmentHub. Apply online for your perfect Amsterdam apartment — start your search today.',
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
