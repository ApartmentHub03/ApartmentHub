import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { buildNeighborhoodMetadata } from '@/lib/seo/neighborhoods';

export async function generateMetadata({ params }) {
    const { id } = await params;
    return buildNeighborhoodMetadata({ slug: id, locale: 'en' });
}

export default function Page() {
    return <NeighborhoodDetail />;
}
