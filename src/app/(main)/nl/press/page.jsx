import PressKit from '@/_pages/PressKit';

export const metadata = {
    title: 'Pers & Media Kit | ApartmentHub Amsterdam',
    description: 'Boilerplate, kerngegevens, citaten en merkmiddelen voor journalisten en bloggers die schrijven over ApartmentHub en de Amsterdamse huurmarkt. Met perscontact en downloadbaar logo.',
    keywords: [
        'ApartmentHub pers',
        'ApartmentHub media kit',
        'Amsterdamse huurmarkt pers',
        'ApartmentHub logo',
        'ApartmentHub boilerplate',
    ],
    alternates: {
        canonical: 'https://apartmenthub.nl/nl/press',
        languages: {
            en: 'https://apartmenthub.nl/en/press',
            nl: 'https://apartmenthub.nl/nl/press',
        },
    },
    openGraph: {
        title: 'Pers & Media Kit | ApartmentHub',
        description: 'Boilerplate, citeerbare kerngegevens en merkmiddelen voor journalisten die schrijven over ApartmentHub en de Amsterdamse huurmarkt.',
        url: 'https://apartmenthub.nl/nl/press',
        type: 'article',
        locale: 'nl_NL',
    },
};

export default function Page() {
    return <PressKit />;
}
