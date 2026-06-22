import Buy from '@/pages/Buy';

export const metadata = {
    title: 'Koop een woning in Amsterdam | ApartmentHub',
    description: 'Persoonlijke aankoopbegeleiding van A tot Z. 1% courtage excl. BTW, no cure no pay. Vind je droomwoning met ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/koop',
        languages: {
            en: 'https://apartmenthub.nl/en/buy',
            nl: 'https://apartmenthub.nl/nl/koop',
        },
    },
};

export default function Page() {
    return <Buy />;
}