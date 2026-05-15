import RentOut from '@/pages/RentOut';

export const metadata = {
    title: 'Rent Out Your Property in Amsterdam | ApartmentHub',
    description: 'List your apartment with ApartmentHub. We connect landlords with quality tenants in Amsterdam.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/rent-out',
        languages: {
            en: 'https://www.apartmenthub.nl/en/rent-out',
            nl: 'https://www.apartmenthub.nl/nl/rent-out',
        },
    },
};

export default function Page() {
    return <RentOut />;
}
