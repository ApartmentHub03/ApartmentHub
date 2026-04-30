import FAQ from '@/pages/FAQ';

export const metadata = {
    title: 'Appartement Huren in Amsterdam: Veelgestelde Vragen | ApartmentHub',
    description: 'Antwoorden op de meest gestelde vragen over een appartement huren in Amsterdam: benodigde documenten, borg en inkomenseisen, bezichtigingen, expat-ondersteuning en wat ApartmentHub voor je doet.',
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
