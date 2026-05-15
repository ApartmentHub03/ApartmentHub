import AppartementenSelectie from '@/pages/AppartementenSelectie';

export const metadata = {
    title: 'Available Apartments in Amsterdam | ApartmentHub',
    description: 'Browse all available rental apartments in Amsterdam. Filter by price, location, and more.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/apartments',
        languages: {
            en: 'https://www.apartmenthub.nl/en/apartments',
            nl: 'https://www.apartmenthub.nl/nl/appartementen',
        },
    },
};

export default function Page() {
    return <AppartementenSelectie />;
}
