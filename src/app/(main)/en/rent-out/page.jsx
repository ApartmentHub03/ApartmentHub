import RentOut from '@/pages/RentOut';

export const metadata = {
    title: 'Rent Out Your Apartment in Amsterdam | Free Price Estimate',
    description: 'Rent out your Amsterdam apartment hassle-free. Get a free rental price estimate, professional photos and screened tenants — first viewing typically within 72 hours.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/rent-out',
        languages: {
            en: 'https://apartmenthub.nl/en/rent-out',
            nl: 'https://apartmenthub.nl/nl/rent-out',
        },
    },
};

export default function Page() {
    return <RentOut />;
}
