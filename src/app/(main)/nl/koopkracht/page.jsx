import BuyingPower from '@/pages/BuyingPower';

export const metadata = {
    title: 'Koopkracht Berekenen | Wat kun je kopen? | ApartmentHub',
    description: 'Bereken in 2 minuten welke wijken in Amsterdam of Midden Nederland haalbaar zijn binnen jouw budget. Krijg een persoonlijk rapport.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/koopkracht',
        languages: {
            en: 'https://apartmenthub.nl/en/buying-power',
            nl: 'https://apartmenthub.nl/nl/koopkracht',
        },
    },
};

export default function Page() {
    return <BuyingPower />;
}