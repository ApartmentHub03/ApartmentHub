import MetaLeadFormB from '@/pages/MetaLeadFormB';

export const metadata = {
    title: 'ApartmentHub - Vind jouw woning',
    description: 'Schrijf je in en ontvang als eerste passende huurwoningen via WhatsApp.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/meta-leadform-b',
        languages: {
            en: 'https://apartmenthub.nl/en/meta-leadform-b',
            nl: 'https://apartmenthub.nl/nl/meta-leadform-b',
        },
    },
};

export default function Page() {
    return <MetaLeadFormB />;
}