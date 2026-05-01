import RentApartmentInAmsterdam from '@/pages/RentApartmentInAmsterdam';

export const metadata = {
    title: 'Rent an Apartment in Amsterdam: Step-by-Step Guide | ApartmentHub',
    description: 'Want to rent an apartment in Amsterdam? Read our tenant guide on documents, deposits, contracts, and registration — plus verified rentals with no agent fees.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/rent-apartment-in-amsterdam',
        languages: {
            en: 'https://apartmenthub.nl/en/rent-apartment-in-amsterdam',
            nl: 'https://apartmenthub.nl/nl/appartement-huren-in-amsterdam',
        },
    },
    openGraph: {
        title: 'Rent an Apartment in Amsterdam: Step-by-Step Guide | ApartmentHub',
        description: 'Tenant guide to renting an apartment in Amsterdam — documents, deposits, contracts, and registration explained.',
        url: 'https://apartmenthub.nl/en/rent-apartment-in-amsterdam',
        type: 'website',
        locale: 'en_NL',
    },
};

export default function Page() {
    return <RentApartmentInAmsterdam lang="en" />;
}
