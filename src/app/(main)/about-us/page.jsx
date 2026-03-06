import About from '@/pages/About';

export const metadata = {
    title: 'About ApartmentHub | Real Estate Agency Amsterdam',
    description: 'Learn about ApartmentHub, your trusted real estate agency in Amsterdam for rental apartments.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/about-us',
        languages: {
            en: 'https://apartmenthub.nl/en/about-us',
            nl: 'https://apartmenthub.nl/nl/about-us',
        },
    },
};

export default function Page() {
    return <About />;
}
