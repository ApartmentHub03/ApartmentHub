import FAQ from '@/pages/FAQ';

export const metadata = {
    title: 'Frequently Asked Questions | ApartmentHub',
    description: 'Find answers to frequently asked questions about renting apartments in Amsterdam with ApartmentHub.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/faq',
        languages: {
            en: 'https://www.apartmenthub.nl/en/faq',
            nl: 'https://www.apartmenthub.nl/nl/faq',
        },
    },
};

export default function Page() {
    return <FAQ />;
}
