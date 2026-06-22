import BuyLead from '@/pages/BuyLead';

export const metadata = {
    title: 'Intakeformulier | Koop een woning | ApartmentHub',
    description: 'Vul ons intakeformulier in en ontvang binnen 24 uur een persoonlijk gesprek.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/koop/lead',
        languages: {
            en: 'https://apartmenthub.nl/en/buy/lead',
            nl: 'https://apartmenthub.nl/nl/koop/lead',
        },
    },
};

export default function Page() {
    return <BuyLead />;
}