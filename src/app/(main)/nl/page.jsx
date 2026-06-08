import Home from '@/pages/Home';

export const metadata = {
    title: 'Appartementen Te Huur in Amsterdam | ApartmentHub - Geverifieerde Huurwoningen',
    description: 'Vind appartementen te huur in Amsterdam op ApartmentHub. Bekijk geverifieerde huurwoningen in heel Nederland, bouw je dossier op en solliciteer online — start vandaag je zoektocht.',
    keywords: ['appartementen te huur amsterdam', 'huurwoning amsterdam', 'appartement huren amsterdam', 'huurappartement amsterdam', 'huurwoningen nederland'],
    alternates: {
        canonical: 'https://apartmenthub.nl/nl',
        languages: {
            en: 'https://apartmenthub.nl/en',
            nl: 'https://apartmenthub.nl/nl',
        },
    },
    openGraph: {
        type: 'website',
        siteName: 'ApartmentHub',
        title: 'Appartementen Te Huur in Amsterdam | ApartmentHub - Geverifieerde Huurwoningen',
        description: 'Vind appartementen te huur in Amsterdam op ApartmentHub. Bekijk geverifieerde huurwoningen in heel Nederland, bouw je dossier op en solliciteer online — start vandaag je zoektocht.',
        url: 'https://apartmenthub.nl/nl',
        locale: 'nl_NL',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Appartementen Te Huur in Amsterdam | ApartmentHub',
        description: 'Vind appartementen te huur in Amsterdam op ApartmentHub. Bekijk geverifieerde huurwoningen en solliciteer vandaag online.',
    },
};

export default function Page() {
    return <Home />;
}
