import BuyingPower from '@/pages/BuyingPower';

export const metadata = {
    title: 'Hypotheek Berekenen | Wat kun je kopen? | ApartmentHub',
    description: 'Bereken je maximale koopprijs en maandlasten in Amsterdam of Midden Nederland. Op basis van Nibud-normen en actuele hypotheekrente.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/koop/koopkracht',
        languages: {
            en: 'https://apartmenthub.nl/en/buy/buying-power',
            nl: 'https://apartmenthub.nl/nl/koop/koopkracht',
        },
    },
};

export default function Page() {
    return <BuyingPower />;
}