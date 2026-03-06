import Contact from '@/pages/Contact';

export const metadata = {
    title: 'Neem Contact Op | ApartmentHub Amsterdam',
    description: 'Neem contact op met ApartmentHub. Wij helpen u graag bij uw zoektocht naar een appartement in Amsterdam.',
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
