import { useEffect } from 'react';

const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "RealEstateAgent"],
    "@id": "https://www.apartmenthub.nl/#organization",
    "name": "ApartmentHub",
    "url": "https://www.apartmenthub.nl",
    "logo": {
        "@type": "ImageObject",
        "url": "https://www.apartmenthub.nl/src/assets/site-logo.png",
        "width": 512,
        "height": 512
    },
    "image": "https://www.apartmenthub.nl/src/assets/site-logo.png",
    "telephone": "+31 6 58 97 54 49",
    "email": "info@apartmenthub.nl",
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Amsterdam",
        "addressCountry": "NL"
    },
    "areaServed": {
        "@type": "City",
        "name": "Amsterdam"
    },
    "description": "ApartmentHub is a real estate agency in Amsterdam helping you find your perfect apartment. We connect tenants and landlords for seamless rental experiences.",
    "sameAs": [
        "https://instagram.com/apartmenthub",
        "https://linkedin.com/company/apartmenthub"
    ],
    "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
    },
    "priceRange": "$$"
};

/**
 * LocalBusinessSchema component
 * Injects JSON-LD structured data into the document head for SEO.
 * Uses a unique ID to prevent duplicate script tags during SPA navigation.
 */
const LocalBusinessSchema = () => {
    useEffect(() => {
        const SCRIPT_ID = 'local-business-jsonld';

        // Prevent duplicate script tags
        if (document.getElementById(SCRIPT_ID)) return;

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(localBusinessSchema);
        document.head.appendChild(script);

        return () => {
            const existing = document.getElementById(SCRIPT_ID);
            if (existing) existing.remove();
        };
    }, []);

    return null;
};

export default LocalBusinessSchema;
