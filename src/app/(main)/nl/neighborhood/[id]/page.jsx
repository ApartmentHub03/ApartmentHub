import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { getNeighborhoodMetadata, neighborhoodSlugs } from '@/data/neighborhoodsData';

export async function generateMetadata({ params }) {
    const { id } = await params;
    const metadata = getNeighborhoodMetadata(id, 'nl');
    if (metadata) return metadata;

    return {
        title: 'Amsterdam Wijkengids | ApartmentHub',
        description: 'Ontdek de beste wijken van Amsterdam. Vind de perfecte buurt om te wonen met onze uitgebreide gids.',
        alternates: { canonical: 'https://apartmenthub.nl/nl/neighborhoods' },
    };
}

export function generateStaticParams() {
    return neighborhoodSlugs.map((id) => ({ id }));
}

export default function Page() {
    return <NeighborhoodDetail />;
}
