import Valuation from '@/pages/Valuation';

export const metadata = {
    title: 'Wat is mijn woning waard? | Gratis waardebepaling | ApartmentHub',
    description: 'Ontvang in 2 minuten een onderbouwde waarde-indicatie van je woning. Adres invullen, wij halen bouwjaar en oppervlakte automatisch op uit het BAG.',
    alternates: {
        canonical: 'https://apartmenthub.nl/waardebepaling',
        languages: {
            en: 'https://apartmenthub.nl/en/valuation',
            nl: 'https://apartmenthub.nl/waardebepaling',
        },
    },
};

export default function Page() {
    return <Valuation />;
}