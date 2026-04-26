import AppartementenSelectie from '@/pages/AppartementenSelectie';

export const metadata = {
    title: 'Huurappartementen in Amsterdam | ApartmentHub',
    description: 'Ontdek huurappartementen in Amsterdam: geverifieerde aanbiedingen, transparante prijzen en direct online solliciteren. Start vandaag bij ApartmentHub.',
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
