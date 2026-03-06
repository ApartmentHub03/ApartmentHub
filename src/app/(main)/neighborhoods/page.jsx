import Neighborhoods from '@/pages/Neighborhoods';

export const metadata = {
    title: 'Amsterdam Neighborhoods Guide | ApartmentHub',
    description: 'Explore Amsterdam neighborhoods and find the best area to rent your next apartment.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/neighborhoods',
        languages: {
            en: 'https://www.apartmenthub.nl/en/neighborhoods',
            nl: 'https://www.apartmenthub.nl/nl/neighborhoods',
        },
    },
};

export default function Page() {
    return <Neighborhoods />;
}
