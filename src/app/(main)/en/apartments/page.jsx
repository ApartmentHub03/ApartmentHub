import AppartementenSelectie from '@/pages/AppartementenSelectie';

export const metadata = {
    title: 'Apartments for Rent in Amsterdam | ApartmentHub',
    description: 'Discover apartments for rent in Amsterdam — verified listings, transparent pricing, and online applications. Find your next home with ApartmentHub today.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/apartments',
        languages: {
            en: 'https://apartmenthub.nl/en/apartments',
            nl: 'https://apartmenthub.nl/nl/appartementen',
        },
    },
};

export default function Page() {
    return <AppartementenSelectie />;
}
