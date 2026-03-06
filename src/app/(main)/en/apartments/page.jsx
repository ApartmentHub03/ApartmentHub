import AppartementenSelectie from '@/pages/AppartementenSelectie';

export const metadata = {
    title: 'Available Apartments in Amsterdam | ApartmentHub',
    description: 'Browse all available rental apartments in Amsterdam. Filter by price, location, and more.',
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
