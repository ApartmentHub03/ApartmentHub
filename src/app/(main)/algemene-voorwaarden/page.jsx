import TermsAndConditions from '@/pages/TermsAndConditions';

export const metadata = {
    title: 'Algemene Voorwaarden | ApartmentHub',
    description: 'Lees de algemene voorwaarden voor het gebruik van ApartmentHub diensten.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/algemene-voorwaarden',
        languages: {
            en: 'https://apartmenthub.nl/en/terms-and-conditions',
            nl: 'https://apartmenthub.nl/nl/algemene-voorwaarden',
        },
    },
};

export default function Page() {
    return <TermsAndConditions />;
}
