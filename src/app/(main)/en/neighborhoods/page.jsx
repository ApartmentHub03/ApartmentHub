import Neighborhoods from '@/pages/Neighborhoods';

export const metadata = {
    title: 'Amsterdam Neighborhoods Guide: Rental Prices & Lifestyle Tips | ApartmentHub',
    description: "The complete guide to Amsterdam's 9 best neighborhoods for renting — Centrum, Jordaan, De Pijp, Oud-Zuid, Oost, Noord, Zuidas, Zeeburg and Nieuw-West. Compare rental prices, vibe and who each area is best for.",
    keywords: [
        'Amsterdam neighborhoods',
        'best neighborhoods Amsterdam',
        'Amsterdam neighborhoods guide',
        'where to live in Amsterdam',
        'Amsterdam rental prices by area',
        'apartments for rent in Amsterdam',
        'Amsterdam expat neighborhoods',
    ],
    alternates: {
        canonical: 'https://apartmenthub.nl/en/neighborhoods',
        languages: {
            en: 'https://apartmenthub.nl/en/neighborhoods',
            nl: 'https://apartmenthub.nl/nl/neighborhoods',
        },
    },
    openGraph: {
        title: 'Amsterdam Neighborhoods Guide | ApartmentHub',
        description: "Compare Amsterdam's 9 most popular neighborhoods — rental prices, lifestyle and the best areas for expats, families, students and creatives.",
        url: 'https://apartmenthub.nl/en/neighborhoods',
        type: 'article',
        locale: 'en_US',
    },
};

export default function Page() {
    return <Neighborhoods />;
}
