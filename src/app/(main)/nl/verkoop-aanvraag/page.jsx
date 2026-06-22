import Sell from '@/pages/Sell';

export const metadata = {
    title: 'Verkoop je woning in Amsterdam | ApartmentHub',
    description: 'Persoonlijke verkoopbegeleiding. 1% courtage excl. BTW, no cure no pay. Verkoop je woning met ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/verkoop-aanvraag',
        languages: {
            en: 'https://apartmenthub.nl/en/sell-lead',
            nl: 'https://apartmenthub.nl/nl/verkoop-aanvraag',
        },
    },
};

export default function Page() {
    return <Sell />;
}