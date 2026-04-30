import FAQ from '@/pages/FAQ';

export const metadata = {
    title: 'Amsterdam Apartment Rental FAQ: Documents, Costs & Process | ApartmentHub',
    description: 'Answers to the most-asked questions about renting an apartment in Amsterdam: required documents, deposit and income rules, viewing process, expat support, and what ApartmentHub does for you.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/faq',
        languages: {
            en: 'https://apartmenthub.nl/en/faq',
            nl: 'https://apartmenthub.nl/nl/faq',
        },
    },
};

export default function Page() {
    return <FAQ />;
}
