import Valuation from '@/pages/Valuation';

export const metadata = {
    title: 'What Is My Property Worth? | Free Valuation | ApartmentHub',
    description: 'Get a substantiated value indication of your property in 2 minutes. Enter your address and we retrieve construction year and surface area from the Kadaster.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/valuation',
        languages: {
            en: 'https://apartmenthub.nl/en/valuation',
            nl: 'https://apartmenthub.nl/waardebepaling',
        },
    },
};

export default function Page() {
    return <Valuation />;
}