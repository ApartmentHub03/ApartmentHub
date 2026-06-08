import Contact from '@/pages/Contact';

export const metadata = {
    title: 'Contact ApartmentHub Amsterdam | WhatsApp, E-mail & Hulp',
    description: 'Hulp nodig bij het huren van een appartement in Amsterdam? Mail ApartmentHub op info@apartmenthub.nl of WhatsApp +31 6 58 97 54 49 — wij reageren binnen 24 uur.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/contact',
        languages: {
            en: 'https://apartmenthub.nl/en/contact',
            nl: 'https://apartmenthub.nl/nl/contact',
        },
    },
};

export default function Page() {
    return <Contact />;
}
