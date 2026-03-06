import TermsAndConditions from '@/pages/TermsAndConditions';

export const metadata = {
    title: 'Algemene Voorwaarden | ApartmentHub',
    description: 'Lees de algemene voorwaarden voor het gebruik van de diensten van ApartmentHub.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/algemene-voorwaarden',
        languages: {
            en: 'https://www.apartmenthub.nl/en/terms-and-conditions',
            nl: 'https://www.apartmenthub.nl/nl/algemene-voorwaarden',
        },
    },
};

export default function Page() {
    return <TermsAndConditions />;
}
