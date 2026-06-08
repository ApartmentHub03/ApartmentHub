import About from '@/pages/About';

export const metadata = {
    title: 'Over ApartmentHub | Verhuurmakelaar Amsterdam voor Huurders & Expats',
    description: 'Maak kennis met ApartmentHub: een verhuurmakelaar in Amsterdam die huurders en expats helpt sneller een geverifieerd appartement te vinden — met transparante prijzen, persoonlijke begeleiding en volledige ondersteuning van zoektocht tot getekend contract.',
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
