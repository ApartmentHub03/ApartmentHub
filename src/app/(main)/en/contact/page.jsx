import Contact from '@/pages/Contact';

export const metadata = {
    title: 'Contact ApartmentHub Amsterdam | WhatsApp, Email & Phone',
    description: 'Reach ApartmentHub for help renting an apartment in Amsterdam. Email info@apartmenthub.nl or WhatsApp +31 6 58 97 54 49 — we reply within 24 hours.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/contact',
        languages: {
            en: 'https://apartmenthub.nl/en/contact',
            nl: 'https://apartmenthub.nl/nl/contact',
        },
    },
};

export default function Page() {
    return <Contact />;
}
