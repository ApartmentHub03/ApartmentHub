import Home from '@/pages/Home';

export const metadata = {
    title: 'ApartmentHub - Vind Jouw Perfecte Appartement in Amsterdam',
    description: 'Vind jouw perfecte huurappartement in Amsterdam met ApartmentHub. Bekijk aanbod, solliciteer online en verhuis zorgeloos.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl',
        languages: {
            en: 'https://www.apartmenthub.nl/en',
            nl: 'https://www.apartmenthub.nl/nl',
        },
    },
};

export default function Page() {
    return <Home />;
}
