import FAQ from '@/pages/FAQ';

export const metadata = {
    title: 'Veelgestelde Vragen | ApartmentHub',
    description: 'Vind antwoorden op veelgestelde vragen over huren in Amsterdam met ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/faq',
        languages: {
            en: 'https://apartmenthub.nl/en/faq',
            nl: 'https://apartmenthub.nl/nl/faq',
        },
    },
};

export default function Page() {
    return <FAQ />;
}
