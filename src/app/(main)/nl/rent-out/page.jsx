import RentOut from '@/pages/RentOut';

export const metadata = {
    title: 'Verhuur Uw Appartement in Amsterdam | Gratis Huurschatting',
    description: 'Verhuur uw Amsterdamse appartement zonder zorgen. Gratis huurprijsschatting, professionele foto\'s en gescreende huurders — eerste bezichtiging vaak binnen 72 uur.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/rent-out',
        languages: {
            en: 'https://apartmenthub.nl/en/rent-out',
            nl: 'https://apartmenthub.nl/nl/rent-out',
        },
    },
};

export default function Page() {
    return <RentOut />;
}
