import Contact from '@/pages/Contact';

export const metadata = {
    title: 'Contact Us | ApartmentHub Amsterdam',
    description: "Get in touch with ApartmentHub. We're here to help with your apartment search in Amsterdam.",
    alternates: {
        canonical: 'https://www.apartmenthub.nl/en/contact',
        languages: {
            en: 'https://www.apartmenthub.nl/en/contact',
            nl: 'https://www.apartmenthub.nl/nl/contact',
        },
    },
};

export default function Page() {
    return <Contact />;
}
