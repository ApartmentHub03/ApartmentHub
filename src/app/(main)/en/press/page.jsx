import PressKit from '@/_pages/PressKit';

export const metadata = {
    title: 'Press & Media Kit | ApartmentHub Amsterdam',
    description: 'Boilerplate copy, key facts, quotable lines and brand assets for journalists and bloggers covering ApartmentHub and the Amsterdam rental market. Press contact and downloadable logo.',
    keywords: [
        'ApartmentHub press',
        'ApartmentHub media kit',
        'Amsterdam rental market press',
        'ApartmentHub logo',
        'ApartmentHub boilerplate',
    ],
    alternates: {
        canonical: 'https://apartmenthub.nl/en/press',
        languages: {
            en: 'https://apartmenthub.nl/en/press',
            nl: 'https://apartmenthub.nl/nl/press',
        },
    },
    openGraph: {
        title: 'Press & Media Kit | ApartmentHub',
        description: 'Boilerplate, quotable facts and brand assets for journalists covering ApartmentHub and the Amsterdam rental market.',
        url: 'https://apartmenthub.nl/en/press',
        type: 'article',
        locale: 'en_US',
    },
};

export default function Page() {
    return <PressKit />;
}
