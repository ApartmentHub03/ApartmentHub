import Neighborhoods from '@/pages/Neighborhoods';

export const metadata = {
    title: 'Amsterdam Wijkengids: Huurprijzen & Woongids per Buurt | ApartmentHub',
    description: 'De complete gids voor de 9 beste wijken van Amsterdam om te huren — Centrum, Jordaan, De Pijp, Oud-Zuid, Oost, Noord, Zuidas, Zeeburg en Nieuw-West. Vergelijk huurprijzen, sfeer en ontdek welke wijk bij jou past.',
    keywords: [
        'Amsterdam wijken',
        'beste wijken Amsterdam',
        'wijkengids Amsterdam',
        'waar wonen in Amsterdam',
        'huurprijzen Amsterdam per wijk',
        'appartement huren Amsterdam',
        'Amsterdam wijk voor expats',
    ],
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/neighborhoods',
        languages: {
            en: 'https://apartmenthub.nl/en/neighborhoods',
            nl: 'https://apartmenthub.nl/nl/neighborhoods',
        },
    },
    openGraph: {
        title: 'Amsterdam Wijkengids | ApartmentHub',
        description: 'Vergelijk de 9 populairste wijken van Amsterdam — huurprijzen, sfeer en de beste buurten voor expats, gezinnen, studenten en creatievelingen.',
        url: 'https://apartmenthub.nl/nl/neighborhoods',
        type: 'article',
        locale: 'nl_NL',
    },
};

export default function Page() {
    return <Neighborhoods />;
}
