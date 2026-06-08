import RentIn from '@/pages/RentIn';

export const metadata = {
    title: 'Amsterdam Appartement Verhuurservice | ApartmentHub',
    description: 'Complete verhuurservice voor appartementen in Amsterdam: handgekozen woningen, bezichtigingen online plannen en sollicitatiebegeleiding via ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/rent-in',
        languages: {
            en: 'https://apartmenthub.nl/en/rent-in',
            nl: 'https://apartmenthub.nl/nl/rent-in',
        },
    },
};

export default function Page() {
    return <RentIn />;
}
