import AppartementenSelectie from '@/pages/AppartementenSelectie';

export const metadata = {
    title: 'Beschikbare Appartementen in Amsterdam | ApartmentHub',
    description: 'Bekijk alle beschikbare huurappartementen in Amsterdam. Filter op prijs, locatie en meer.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/appartementen',
        languages: {
            en: 'https://www.apartmenthub.nl/en/apartments',
            nl: 'https://www.apartmenthub.nl/nl/appartementen',
        },
    },
};

export default function Page() {
    return <AppartementenSelectie />;
}
