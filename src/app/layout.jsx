import '@/index.css';
import Providers from '@/components/Providers';
import Script from 'next/script';

export const metadata = {
    title: {
        default: 'Amsterdam Apartments for Rent | ApartmentHub - Verified Listings',
        template: '%s | ApartmentHub',
    },
    description: 'Find Amsterdam apartments for rent on ApartmentHub. Browse verified rental listings across the Netherlands, build your dossier, and apply online — start your search today.',
    metadataBase: new URL('https://apartmenthub.nl'),
    verification: {
        google: 'WEk3DyM5hwLTLGZl6tySEgdmRfr5fd21mH53OExkkx0',
    },
    icons: {
        icon: '/favicon.png',
    },
    openGraph: {
        type: 'website',
        siteName: 'ApartmentHub',
        title: 'Amsterdam Apartments for Rent | ApartmentHub - Verified Listings',
        description: 'Find Amsterdam apartments for rent on ApartmentHub. Browse verified rental listings across the Netherlands, build your dossier, and apply online — start your search today.',
        url: 'https://apartmenthub.nl',
        locale: 'en_US',
        images: [
            {
                url: '/images/site-logo.png',
                width: 512,
                height: 512,
                alt: 'ApartmentHub - Amsterdam apartments for rent',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Amsterdam Apartments for Rent | ApartmentHub',
        description: 'Find Amsterdam apartments for rent on ApartmentHub. Browse verified rental listings across the Netherlands and apply online today.',
        images: ['/images/site-logo.png'],
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#009B8A',
};

// JSON-LD Structured Data (LocalBusiness + RealEstateAgent)
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'RealEstateAgent'],
    '@id': 'https://apartmenthub.nl/#organization',
    name: 'ApartmentHub',
    url: 'https://apartmenthub.nl',
    logo: {
        '@type': 'ImageObject',
        url: 'https://apartmenthub.nl/images/site-logo.png',
        width: 512,
        height: 512,
    },
    image: 'https://apartmenthub.nl/images/site-logo.png',
    telephone: '+31 6 58 97 54 49',
    email: 'info@apartmenthub.nl',
    address: {
        '@type': 'PostalAddress',
        addressLocality: 'Amsterdam',
        addressCountry: 'NL',
    },
    areaServed: {
        '@type': 'City',
        name: 'Amsterdam',
    },
    description:
        'ApartmentHub is a real estate agency in Amsterdam helping you find your perfect apartment. We connect tenants and landlords for seamless rental experiences.',
    sameAs: [
        'https://instagram.com/apartmenthub',
        'https://linkedin.com/company/apartmenthub',
    ],
    openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
    },
    priceRange: '$$',
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        bestRating: '5',
        worstRating: '1',
        reviewCount: '3',
    },
    review: [
        {
            '@type': 'Review',
            author: {
                '@type': 'Person',
                name: 'Robert van Dijk',
            },
            reviewRating: {
                '@type': 'Rating',
                ratingValue: '5',
                bestRating: '5',
            },
            datePublished: '2024-12-01',
            reviewBody:
                'Apartment rented within 3 days, even at €50 above asking price. After a previous agent who did nothing for 2 months, this is how renting should be — no stress, just results.',
        },
        {
            '@type': 'Review',
            author: {
                '@type': 'Person',
                name: 'Maria Santos',
            },
            reviewRating: {
                '@type': 'Rating',
                ratingValue: '5',
                bestRating: '5',
            },
            datePublished: '2024-11-15',
            reviewBody:
                'All four of my properties rented at top price — €8,200 per month total, with screened tenants on permanent contracts. Transparent communication and useful monthly reports. Finally an agent who understands how to work with investors.',
        },
        {
            '@type': 'Review',
            author: {
                '@type': 'Person',
                name: 'Jan Willem Bakker',
            },
            reviewRating: {
                '@type': 'Rating',
                ratingValue: '5',
                bestRating: '5',
            },
            datePublished: '2024-10-20',
            reviewBody:
                'From complete beginner to confident landlord in just a few weeks. Documents in order, market-conform rent, and well-screened tenants. ApartmentHub really makes renting accessible.',
        },
    ],
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                {/* Performance optimizations */}
                <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

                {/* JSON-LD Structured Data */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body>
                {/* Google Tag Manager (noscript) */}
                <noscript>
                    <iframe
                        src="https://www.googletagmanager.com/ns.html?id=GTM-KZBH8MVX"
                        height="0"
                        width="0"
                        style={{ display: 'none', visibility: 'hidden' }}
                    />
                </noscript>

                <Providers>
                    {children}
                </Providers>

                {/* Google Analytics */}
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-GYERTDXNFC"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-GYERTDXNFC');
                    `}
                </Script>

                {/* Google Tag Manager */}
                <Script id="gtm" strategy="afterInteractive">
                    {`
                        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                        })(window,document,'script','dataLayer','GTM-KZBH8MVX');
                    `}
                </Script>
            </body>
        </html>
    );
}
