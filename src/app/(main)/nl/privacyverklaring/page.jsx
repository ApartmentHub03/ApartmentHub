import PrivacyPage from '@/pages/PrivacyPage';

export const metadata = {
    title: 'Privacyverklaring | ApartmentHub',
    description: 'Lees de privacyverklaring van ApartmentHub. Ontdek hoe wij uw persoonsgegevens behandelen.',
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
