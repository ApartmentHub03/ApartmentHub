import TermsSell from '@/pages/TermsSell';

export const metadata = {
    title: 'Algemene Voorwaarden Verkoopbemiddeling | ApartmentHub',
    description: 'Lees de algemene voorwaarden voor de verkoopbemiddeling van ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/algemene-voorwaarden-verkoop',
        languages: {
            en: 'https://apartmenthub.nl/en/terms-and-conditions-sell',
            nl: 'https://apartmenthub.nl/nl/algemene-voorwaarden-verkoop',
        },
    },
};

export default function Page() {
    return <TermsSell />;
}