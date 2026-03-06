import AppartementenSelectie from '@/pages/AppartementenSelectie';

export const metadata = {
    title: 'Beschikbare Appartementen in Amsterdam | ApartmentHub',
    description: 'Bekijk alle beschikbare huurappartementen in Amsterdam. Vind jouw perfecte woning met ApartmentHub.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/appartementen',
        languages: {
            en: 'https://apartmenthub.nl/en/apartments',
            nl: 'https://apartmenthub.nl/nl/appartementen',
        },
    },
};

export default function Page() {
    return <AppartementenSelectie />;
}
