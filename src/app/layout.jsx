import '@/index.css';
import Providers from '@/components/Providers';
import Script from 'next/script';

export const metadata = {
    title: {
        default: 'ApartmentHub - Find Your Perfect Apartment in Amsterdam',
        template: '%s | ApartmentHub',
    },
    description: 'ApartmentHub - Find your perfect apartment in Amsterdam',
    metadataBase: new URL('https://www.apartmenthub.nl'),
    verification: {
        google: 'WEk3DyM5hwLTLGZl6tySEgdmRfr5fd21mH53OExkkx0',
    },
    icons: {
        icon: '/favicon.png',
    },
};

export const viewport = {
    themeColor: '#009B8A',
};

// JSON-LD Structured Data (LocalBusiness + RealEstateAgent)
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'RealEstateAgent'],
    '@id': 'https://www.apartmenthub.nl/#organization',
    name: 'ApartmentHub',
    url: 'https://www.apartmenthub.nl',
    logo: {
        '@type': 'ImageObject',
        url: 'https://www.apartmenthub.nl/images/site-logo.png',
        width: 512,
        height: 512,
    },
    image: 'https://www.apartmenthub.nl/images/site-logo.png',
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
