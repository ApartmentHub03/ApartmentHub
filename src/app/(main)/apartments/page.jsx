import AppartementenSelectie from '@/pages/AppartementenSelectie';

export const metadata = {
    title: 'Available Apartments in Amsterdam | ApartmentHub',
    description: 'Browse all available rental apartments in Amsterdam. Find your perfect home with ApartmentHub.',
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
