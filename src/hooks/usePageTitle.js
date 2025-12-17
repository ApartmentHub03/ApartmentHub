import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { translations } from '../data/translations';

const usePageTitle = () => {
    const location = useLocation();
    const { language } = useSelector((state) => state.ui);

    useEffect(() => {
        const path = location.pathname;
        let titleKey = 'home'; // Default to home

        // Normalize path to ignore language prefix and leading/trailing slashes for matching
        // This is a simple matching logic based on the known routes in App.jsx
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
        } else if (normalizedPath.includes('neighborhoods')) { // This must come before 'neighborhood' detailed check if they were same prefix, but 'neighborhoods' is distinct enough or we can match exact
            titleKey = 'neighborhoods';
        } else if (normalizedPath.includes('neighborhood/')) { // Detailed view - maybe just generic 'Neighborhoods' title or specific?
            // For now, let's keep it simple or check if there is a specific key. 
            // The nav doesn't have a specific key for detail, so let's stick to 'neighborhoods' parent key or just 'ApartmentHub' for detailed views if we want.
            // But the user asked for page name. 'Neighborhoods' seems appropriate.
            titleKey = 'neighborhoods';
        } else if (normalizedPath.includes('faq')) {
            titleKey = 'faq';
        } else if (normalizedPath.includes('about-us') || normalizedPath === 'about') {
            titleKey = 'about';
        } else if (normalizedPath.includes('contact')) {
            titleKey = 'contact';
        } else if (normalizedPath.includes('application') || normalizedPath.includes('aanvraag')) {
            titleKey = 'aanvraag'; // Assuming 'aanvraag' key exists or will use fallback, checking translations.js next might be needed but likely 'aanvraag' structure exists given component name
        } else {
            // Fallback for unknown routes or catch-all
            titleKey = 'home';
        }

        const titleText = translations.nav[language][titleKey] || 'ApartmentHub';
        document.title = `${titleText} | ApartmentHub`;

    }, [location, language]);
};

export default usePageTitle;
