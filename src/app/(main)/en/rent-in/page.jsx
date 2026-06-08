import RentIn from '@/pages/RentIn';

export const metadata = {
    title: 'Amsterdam Apartment Rental Service | ApartmentHub',
    description: 'Full-service apartment rental in Amsterdam: handpicked listings, online viewing bookings, and end-to-end application support. Get started with ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/rent-in',
        languages: {
            en: 'https://apartmenthub.nl/en/rent-in',
            nl: 'https://apartmenthub.nl/nl/rent-in',
        },
    },
};

export default function Page() {
    return <RentIn />;
}
