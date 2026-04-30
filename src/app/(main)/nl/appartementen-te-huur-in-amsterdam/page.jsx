import ApartmentsForRentInAmsterdam from '@/pages/ApartmentsForRentInAmsterdam';

export const metadata = {
    title: 'Appartementen te huur in Amsterdam | ApartmentHub',
    description: 'Vind appartementen te huur in Amsterdam met ApartmentHub: geverifieerde woningen in elke wijk, transparante huurprijzen en persoonlijke begeleiding voor huurders en expats.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        languages: {
            en: 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam',
            nl: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        },
    },
    openGraph: {
        title: 'Appartementen te huur in Amsterdam | ApartmentHub',
        description: 'Geverifieerde appartementen te huur in Amsterdam, met persoonlijke begeleiding voor huurders en expats.',
        url: 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam',
        type: 'website',
        locale: 'nl_NL',
    },
};

export default function Page() {
    return <ApartmentsForRentInAmsterdam lang="nl" />;
}
