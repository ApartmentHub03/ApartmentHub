import About from '@/pages/About';

export const metadata = {
    title: 'Over ApartmentHub | Makelaar Amsterdam',
    description: 'Leer meer over ApartmentHub, de vertrouwde makelaar in Amsterdam die huurders en verhuurders verbindt.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/about-us',
        languages: {
            en: 'https://apartmenthub.nl/en/about-us',
            nl: 'https://apartmenthub.nl/nl/about-us',
        },
    },
};

export default function Page() {
    return <About />;
}
