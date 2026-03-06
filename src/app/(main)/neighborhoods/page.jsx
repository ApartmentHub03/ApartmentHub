import Neighborhoods from '@/pages/Neighborhoods';

export const metadata = {
    title: 'Amsterdam Neighborhoods Guide | ApartmentHub',
    description: 'Explore Amsterdam neighborhoods and find the best area to rent your next apartment.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/neighborhoods',
        languages: {
            en: 'https://apartmenthub.nl/en/neighborhoods',
            nl: 'https://apartmenthub.nl/nl/neighborhoods',
        },
    },
};

export default function Page() {
    return <Neighborhoods />;
}
