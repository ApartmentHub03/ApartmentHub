import About from '@/pages/About';

export const metadata = {
    title: 'Over ApartmentHub | Makelaar Amsterdam',
    description: 'Leer meer over ApartmentHub, de vertrouwde makelaar in Amsterdam die huurders en verhuurders verbindt.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/about-us',
        languages: {
            en: 'https://www.apartmenthub.nl/en/about-us',
            nl: 'https://www.apartmenthub.nl/nl/about-us',
        },
    },
};

export default function Page() {
    return <About />;
}
