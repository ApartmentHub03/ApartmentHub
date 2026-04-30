import ApartmentsForRentInAmsterdam from '@/pages/ApartmentsForRentInAmsterdam';

export const metadata = {
    title: 'Apartments for Rent in Amsterdam | ApartmentHub',
    description: 'Find apartments for rent in Amsterdam with ApartmentHub: verified listings across every neighborhood, transparent prices, and end-to-end support for tenants and expats.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
        languages: {
            en: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
            nl: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        },
    },
    openGraph: {
        title: 'Apartments for Rent in Amsterdam | ApartmentHub',
        description: 'Verified apartments for rent in Amsterdam, with personal support for tenants and expats relocating to the city.',
        url: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
        type: 'website',
        locale: 'en_NL',
    },
};

export default function Page() {
    return <ApartmentsForRentInAmsterdam lang="en" />;
}
