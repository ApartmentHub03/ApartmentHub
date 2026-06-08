import About from '@/pages/About';

export const metadata = {
    title: 'About ApartmentHub | Amsterdam Apartment Rental Agency for Tenants & Expats',
    description: 'Meet ApartmentHub: an Amsterdam rental agency helping tenants and expats find verified apartments faster — with transparent prices, personal guidance, and end-to-end support from search to signed contract.',
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
