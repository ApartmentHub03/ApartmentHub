import PrivacyPage from '@/pages/PrivacyPage';

export const metadata = {
    title: 'Privacy Policy | ApartmentHub',
    description: 'Read ApartmentHub\'s privacy policy. Learn how we handle your personal data.',
    alternates: {
        canonical: 'https://apartmenthub.nl/en/privacy-policy',
        languages: {
            en: 'https://apartmenthub.nl/en/privacy-policy',
            nl: 'https://apartmenthub.nl/nl/privacyverklaring',
        },
    },
};

export default function Page() {
    return <PrivacyPage />;
}
