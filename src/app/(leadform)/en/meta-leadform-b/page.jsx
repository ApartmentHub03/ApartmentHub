import MetaLeadFormB from '@/pages/MetaLeadFormB';

export const metadata = {
    title: 'ApartmentHub - Find your home',
    description: 'Tell us what you\u2019re looking for and our team sends you matching homes directly via WhatsApp.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/meta-leadform-b',
        languages: {
            en: 'https://apartmenthub.nl/en/meta-leadform-b',
            nl: 'https://apartmenthub.nl/nl/meta-leadform-b',
        },
    },
};

export default function Page() {
    return <MetaLeadFormB />;
}