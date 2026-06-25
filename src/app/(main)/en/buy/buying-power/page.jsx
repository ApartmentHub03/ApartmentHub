import BuyingPower from '@/pages/BuyingPower';

export const metadata = {
    title: 'Mortgage Calculator | What Can You Afford? | ApartmentHub',
    description: 'Calculate your maximum purchase price and monthly mortgage costs in Amsterdam or Central Netherlands. Based on Nibud standards and current interest rates.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/buy/buying-power',
        languages: {
            en: 'https://apartmenthub.nl/en/buy/buying-power',
            nl: 'https://apartmenthub.nl/nl/koop/koopkracht',
        },
    },
};

export default function Page() {
    return <BuyingPower />;
}