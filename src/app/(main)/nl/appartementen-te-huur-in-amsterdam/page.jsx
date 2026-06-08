import ApartmentsForRentInAmsterdam from '@/pages/ApartmentsForRentInAmsterdam';

export const metadata = {
    title: 'Appartementen te huur in Amsterdam — Geverifieerde aanbod | ApartmentHub',
    description: 'Bekijk appartementen te huur in Amsterdam: geverifieerde woningen in elke wijk, transparante huurprijzen en geen courtage voor huurders. Solliciteer online via ApartmentHub.',
    keywords: [
        'appartementen te huur amsterdam',
        'appartement huren amsterdam',
        'huurappartementen amsterdam',
        'amsterdam appartement huren',
        'woning huren amsterdam',
    ],
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        languages: {
            en: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
            nl: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        },
    },
    openGraph: {
        title: 'Appartementen te huur in Amsterdam — Geverifieerde aanbod | ApartmentHub',
        description: 'Bekijk appartementen te huur in Amsterdam: geverifieerde woningen in elke wijk, transparante huurprijzen en geen courtage voor huurders. Solliciteer online via ApartmentHub.',
        url: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        type: 'website',
        locale: 'nl_NL',
        siteName: 'ApartmentHub',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Appartementen te huur in Amsterdam | ApartmentHub',
        description: 'Geverifieerde appartementen te huur in Amsterdam — elke wijk, transparante prijzen, geen courtage. Solliciteer online via ApartmentHub.',
    },
};

export default function Page() {
    return <ApartmentsForRentInAmsterdam lang="nl" />;
}
