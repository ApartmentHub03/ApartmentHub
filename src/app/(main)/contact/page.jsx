import Contact from '@/pages/Contact';

export const metadata = {
    title: 'Contact Us | ApartmentHub Amsterdam',
    description: 'Get in touch with ApartmentHub. Contact us for questions about renting apartments in Amsterdam.',
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
