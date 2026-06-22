import BuyingPower from '@/pages/BuyingPower';

export const metadata = {
    title: 'Buying Power Calculator | What Can You Afford? | ApartmentHub',
    description: 'Find out which Amsterdam or Utrecht neighborhoods fit your budget in 2 minutes. Get a personalized affordability report.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/buying-power',
        languages: {
            en: 'https://apartmenthub.nl/en/buying-power',
            nl: 'https://apartmenthub.nl/nl/koopkracht',
        },
    },
};

export default function Page() {
    return <BuyingPower />;
}