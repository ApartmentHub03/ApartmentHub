import Neighborhoods from '@/pages/Neighborhoods';

export const metadata = {
    title: 'Amsterdam Neighborhoods Guide | ApartmentHub',
    description: "Discover Amsterdam's best neighborhoods. Find the perfect area to live with our comprehensive guide.",
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
