import PrivacyPage from '@/pages/PrivacyPage';

export const metadata = {
    title: 'Privacyverklaring | ApartmentHub',
    description: 'Lees de privacyverklaring van ApartmentHub. Ontdek hoe wij uw persoonsgegevens behandelen.',
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/privacyverklaring',
        languages: {
            en: 'https://apartmenthub.nl/en/privacy-policy',
            nl: 'https://apartmenthub.nl/nl/privacyverklaring',
        },
    },
};

export default function Page() {
    return <PrivacyPage />;
}
