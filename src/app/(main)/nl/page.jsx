import Home from '@/pages/Home';

export const metadata = {
    title: 'ApartmentHub - Vind Jouw Perfecte Appartement in Amsterdam',
    description: 'Bekijk geverifieerde huurwoningen in heel Nederland met ApartmentHub. Solliciteer online voor jouw perfecte appartement in Amsterdam — start vandaag je zoektocht.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl',
        languages: {
            en: 'https://apartmenthub.nl/en',
            nl: 'https://apartmenthub.nl/nl',
        },
    },
};

export default function Page() {
    return <Home />;
}
