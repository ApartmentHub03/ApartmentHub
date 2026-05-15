import RentIn from '@/pages/RentIn';

export const metadata = {
    title: 'Rent an Apartment in Amsterdam | ApartmentHub',
    description: 'Looking to rent in Amsterdam? Browse available apartments and apply directly through ApartmentHub.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/rent-in',
        languages: {
            en: 'https://www.apartmenthub.nl/en/rent-in',
            nl: 'https://www.apartmenthub.nl/nl/rent-in',
        },
    },
};

export default function Page() {
    return <RentIn />;
}
