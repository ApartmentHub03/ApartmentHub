import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { translations } from '../data/translations';

const SITE_URL = 'https://www.apartmenthub.nl';

// Map normalized paths to their canonical URL paths
const getCanonicalPath = (normalizedPath) => {
    if (normalizedPath === '/' || normalizedPath === '') {
        return '/';
    }

    // Rent Out variants
    if (normalizedPath.includes('rent-out') || normalizedPath === 'landlords') {
        return '/en/rent-out';
    }

    // Rent In variants
    if (normalizedPath.includes('rent-in') || normalizedPath === 'tenants') {
        return '/en/rent-in';
    }

    // Neighborhoods list
    if (normalizedPath === 'neighborhoods' || normalizedPath === 'neighborhoods/') {
        return '/en/neighborhoods';
    }

    // Neighborhood detail (preserve the dynamic :id)
    if (normalizedPath.includes('neighborhood/')) {
        const id = normalizedPath.split('neighborhood/')[1];
        return `/en/neighborhood/${id}`;
    }

    // FAQ
    if (normalizedPath === 'faq') {
        return '/en/faq';
    }

    // About
    if (normalizedPath.includes('about-us') || normalizedPath === 'about') {
        return '/en/about-us';
    }

    // Discover More
    if (normalizedPath.includes('discover-more')) {
        return '/en/discover-more';
    }

    // Contact
    if (normalizedPath === 'contact') {
        return '/en/contact';
    }

    // Privacy
    if (normalizedPath.includes('privacy') || normalizedPath === 'privacyverklaring') {
        return '/en/privacy-policy';
    }

    // Terms
    if (normalizedPath.includes('terms') || normalizedPath.includes('algemene-voorwaarden')) {
        return '/en/terms-and-conditions';
    }

    // Login
    if (normalizedPath.includes('login')) {
        return '/login';
    }

    // Signup
    if (normalizedPath.includes('signup')) {
        return '/signup';
    }

    // Application / Aanvraag
    if (normalizedPath.includes('application') || normalizedPath.includes('aanvraag')) {
        return '/aanvraag';
    }

    // Appartementen
    if (normalizedPath.includes('appartementen') || normalizedPath.includes('apartments')) {
        return '/appartementen';
    }

    // Letter of Intent
    if (normalizedPath.includes('letter-of-intent') || normalizedPath.includes('intentieverklaring')) {
        return '/letter-of-intent';
    }

    // Fallback: use current normalized path
    return `/${normalizedPath}`;
};

const usePageTitle = () => {
    const location = useLocation();
    const { language } = useSelector((state) => state.ui);

    useEffect(() => {
        const path = location.pathname;
        let titleKey = 'home'; // Default to home

        // Normalize path to ignore language prefix and leading/trailing slashes for matching
        let normalizedPath = path.toLowerCase();

        // Remove language prefix if present (e.g., /en/..., /nl/...)
        if (normalizedPath.startsWith('/en/') || normalizedPath.startsWith('/nl/')) {
            normalizedPath = normalizedPath.substring(3);
        } else if (normalizedPath === '/en' || normalizedPath === '/nl') {
            normalizedPath = '/';
        }

        // Remove leading slash if not root
        if (normalizedPath.startsWith('/') && normalizedPath.length > 1) {
            normalizedPath = normalizedPath.substring(1);
        }

        // Simple routing map to translation keys
        if (normalizedPath === '/' || normalizedPath === '') {
            titleKey = 'home';
        } else if (normalizedPath.includes('rent-out') || normalizedPath === 'landlords') {
            titleKey = 'rentOut';
        } else if (normalizedPath.includes('rent-in') || normalizedPath === 'tenants') {
            titleKey = 'rentIn';
        } else if (normalizedPath.includes('neighborhoods')) {
            titleKey = 'neighborhoods';
        } else if (normalizedPath.includes('neighborhood/')) {
            titleKey = 'neighborhoods';
        } else if (normalizedPath.includes('faq')) {
            titleKey = 'faq';
        } else if (normalizedPath.includes('about-us') || normalizedPath === 'about') {
            titleKey = 'about';
        } else if (normalizedPath.includes('contact')) {
            titleKey = 'contact';
        } else if (normalizedPath.includes('application') || normalizedPath.includes('aanvraag')) {
            titleKey = 'aanvraag';
        } else {
            titleKey = 'home';
        }

        const titleText = translations.nav[language][titleKey] || 'ApartmentHub';
        document.title = `${titleText} | ApartmentHub`;

        // Set canonical tag
        const canonicalPath = getCanonicalPath(normalizedPath);
        const canonicalUrl = `${SITE_URL}${canonicalPath}`;

        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.setAttribute('href', canonicalUrl);

    }, [location, language]);
};

export default usePageTitle;
