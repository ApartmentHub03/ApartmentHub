import Sell from '@/pages/Sell';

export const metadata = {
    title: 'Sell Your Property in Amsterdam | ApartmentHub',
    description: 'Personal sales guidance. 1% commission excl. VAT, no cure no pay. Sell your property with ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/sell',
        languages: {
            en: 'https://apartmenthub.nl/en/sell',
            nl: 'https://apartmenthub.nl/verkoop',
        },
    },
};

export default function Page() {
    return <Sell />;
}