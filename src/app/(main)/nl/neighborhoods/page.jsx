import Neighborhoods from '@/pages/Neighborhoods';

export const metadata = {
    title: 'Amsterdam Wijkengids | ApartmentHub',
    description: 'Ontdek de beste wijken van Amsterdam. Vind de perfecte buurt om te wonen met onze uitgebreide gids.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/neighborhoods',
        languages: {
            en: 'https://www.apartmenthub.nl/en/neighborhoods',
            nl: 'https://www.apartmenthub.nl/nl/neighborhoods',
        },
    },
};

export default function Page() {
    return <Neighborhoods />;
}
