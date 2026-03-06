import RentOut from '@/pages/RentOut';

export const metadata = {
    title: 'Verhuur Uw Woning in Amsterdam | ApartmentHub',
    description: 'Plaats uw appartement bij ApartmentHub. Wij verbinden verhuurders met kwaliteitshuurders in Amsterdam.',
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
