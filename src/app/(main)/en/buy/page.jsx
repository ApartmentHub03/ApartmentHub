import Buy from '@/pages/Buy';

export const metadata = {
    title: 'Buy a Home in Amsterdam | ApartmentHub',
    description: 'Personal purchase guidance from A to Z. 1% commission, no cure no pay. Find your dream home with ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/buy',
        languages: {
            en: 'https://apartmenthub.nl/en/buy',
            nl: 'https://apartmenthub.nl/nl/koop',
        },
    },
};

export default function Page() {
    return <Buy />;
}