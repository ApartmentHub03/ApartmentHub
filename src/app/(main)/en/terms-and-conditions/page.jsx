import TermsAndConditions from '@/pages/TermsAndConditions';

export const metadata = {
    title: 'Terms and Conditions | ApartmentHub',
    description: 'Read the terms and conditions for using ApartmentHub\'s services.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/terms-and-conditions',
        languages: {
            en: 'https://www.apartmenthub.nl/en/terms-and-conditions',
            nl: 'https://www.apartmenthub.nl/nl/algemene-voorwaarden',
        },
    },
};

export default function Page() {
    return <TermsAndConditions />;
}
