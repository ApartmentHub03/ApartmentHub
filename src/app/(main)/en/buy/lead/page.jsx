import BuyLead from '@/pages/BuyLead';

export const metadata = {
    title: 'Intake Form | Buy a Home | ApartmentHub',
    description: 'Fill in our intake form and receive a personal call within 24 hours.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/buy/lead',
        languages: {
            en: 'https://apartmenthub.nl/en/buy/lead',
            nl: 'https://apartmenthub.nl/nl/koop/lead',
        },
    },
};

export default function Page() {
    return <BuyLead />;
}