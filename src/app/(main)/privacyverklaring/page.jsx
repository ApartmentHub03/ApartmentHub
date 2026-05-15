import PrivacyPage from '@/pages/PrivacyPage';

export const metadata = {
    title: 'Privacyverklaring | ApartmentHub',
    description: 'Lees het privacybeleid van ApartmentHub om te begrijpen hoe wij omgaan met uw persoonlijke gegevens.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/nl/privacyverklaring',
        languages: {
            en: 'https://www.apartmenthub.nl/en/privacy-policy',
            nl: 'https://www.apartmenthub.nl/nl/privacyverklaring',
        },
    },
};

export default function Page() {
    return <PrivacyPage />;
}
