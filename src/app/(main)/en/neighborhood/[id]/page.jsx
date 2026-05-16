import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { getNeighborhoodMetadata, neighborhoodSlugs } from '@/data/neighborhoodsData';

export async function generateMetadata({ params }) {
    const { id } = await params;
    const metadata = getNeighborhoodMetadata(id, 'en');
    if (metadata) return metadata;

    return {
        title: 'Amsterdam Neighborhood Guide | ApartmentHub',
        description: "Discover Amsterdam's best neighborhoods. Find the perfect area to live with our comprehensive guide.",
        alternates: { canonical: 'https://apartmenthub.nl/en/neighborhoods' },
    };
}

export function generateStaticParams() {
    return neighborhoodSlugs.map((id) => ({ id }));
}

export default function Page() {
    return <NeighborhoodDetail />;
}
