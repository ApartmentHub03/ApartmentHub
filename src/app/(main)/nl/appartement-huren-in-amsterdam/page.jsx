import RentApartmentInAmsterdam from '@/pages/RentApartmentInAmsterdam';

export const metadata = {
    title: 'Appartement huren in Amsterdam: Stappenplan voor huurders | ApartmentHub',
    description: 'Een appartement huren in Amsterdam? Lees onze huurdersgids over documenten, borg, contracten en inschrijving — plus geverifieerd aanbod zonder courtage.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/appartement-huren-in-amsterdam',
        languages: {
            en: 'https://apartmenthub.nl/en/rent-apartment-in-amsterdam',
            nl: 'https://apartmenthub.nl/nl/appartement-huren-in-amsterdam',
        },
    },
    openGraph: {
        title: 'Appartement huren in Amsterdam: Stappenplan voor huurders | ApartmentHub',
        description: 'Stappenplan voor het huren van een appartement in Amsterdam — documenten, borg, contracten en inschrijving uitgelegd.',
        url: 'https://apartmenthub.nl/nl/appartement-huren-in-amsterdam',
        type: 'website',
        locale: 'nl_NL',
    },
};

export default function Page() {
    return <RentApartmentInAmsterdam lang="nl" />;
}
