import ApartmentsForRentInAmsterdam from '@/pages/ApartmentsForRentInAmsterdam';

export const metadata = {
    title: 'Apartments for Rent in Amsterdam — Verified Listings | ApartmentHub',
    description: 'Browse apartments for rent in Amsterdam: verified listings in every neighborhood, transparent prices, and no agent fees for tenants. Apply online with ApartmentHub.',
    keywords: [
        'apartments for rent amsterdam',
        'apartments for rent in amsterdam',
        'amsterdam apartments for rent',
        'rent apartment amsterdam',
        'amsterdam apartment rentals',
        'apartments to rent amsterdam',
    ],
    alternates: {
        canonical: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
        languages: {
            en: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
            nl: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        },
    },
    openGraph: {
        title: 'Apartments for Rent in Amsterdam — Verified Listings | ApartmentHub',
        description: 'Browse apartments for rent in Amsterdam: verified listings in every neighborhood, transparent prices, and no agent fees for tenants. Apply online with ApartmentHub.',
        url: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
        type: 'website',
        locale: 'en_NL',
        siteName: 'ApartmentHub',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Apartments for Rent in Amsterdam | ApartmentHub',
        description: 'Verified apartments for rent in Amsterdam — every neighborhood, transparent prices, no tenant fees. Apply online with ApartmentHub.',
    },
};

export default function Page() {
    return <ApartmentsForRentInAmsterdam lang="en" />;
}
