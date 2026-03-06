import RentIn from '@/pages/RentIn';

export const metadata = {
    title: 'Huur een Appartement in Amsterdam | ApartmentHub',
    description: 'Op zoek naar een huurwoning in Amsterdam? Bekijk beschikbare appartementen en solliciteer direct via ApartmentHub.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/rent-in',
        languages: {
            en: 'https://www.apartmenthub.nl/en/rent-in',
            nl: 'https://www.apartmenthub.nl/nl/rent-in',
        },
    },
};

export default function Page() {
    return <RentIn />;
}
