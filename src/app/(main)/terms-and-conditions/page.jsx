import TermsAndConditions from '@/pages/TermsAndConditions';

export const metadata = {
    title: 'Terms and Conditions | ApartmentHub',
    description: 'Read the terms and conditions for using ApartmentHub services.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/terms-and-conditions',
        languages: {
            en: 'https://apartmenthub.nl/en/terms-and-conditions',
            nl: 'https://apartmenthub.nl/nl/algemene-voorwaarden',
        },
    },
};

export default function Page() {
    return <TermsAndConditions />;
}
