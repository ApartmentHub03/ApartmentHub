import PrivacyPage from '@/pages/PrivacyPage';

export const metadata = {
    title: 'Privacy Policy | ApartmentHub',
    description: 'Read the ApartmentHub privacy policy to understand how we handle your personal data.',
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/privacy-policy',
        languages: {
            en: 'https://www.apartmenthub.nl/en/privacy-policy',
            nl: 'https://www.apartmenthub.nl/nl/privacyverklaring',
        },
    },
};

export default function Page() {
    return <PrivacyPage />;
}
