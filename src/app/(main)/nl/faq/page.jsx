import FAQ from '@/pages/FAQ';

export const metadata = {
    title: 'Veelgestelde Vragen | ApartmentHub',
    description: 'Vind antwoorden op veelgestelde vragen over huren in Amsterdam met ApartmentHub.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/faq',
        languages: {
            en: 'https://www.apartmenthub.nl/en/faq',
            nl: 'https://www.apartmenthub.nl/nl/faq',
        },
    },
};

export default function Page() {
    return <FAQ />;
}
