import TermsSell from '@/pages/TermsSell';

export const metadata = {
    title: 'Terms and Conditions — Sale Brokerage | ApartmentHub',
    description: 'Read the terms and conditions for ApartmentHub\'s sale brokerage services.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/terms-and-conditions-sell',
        languages: {
            en: 'https://apartmenthub.nl/en/terms-and-conditions-sell',
            nl: 'https://apartmenthub.nl/nl/algemene-voorwaarden-verkoop',
        },
    },
};

export default function Page() {
    return <TermsSell />;
}