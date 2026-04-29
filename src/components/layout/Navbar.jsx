'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, X, LogIn } from 'lucide-react';
import { toggleMobileMenu, closeMobileMenu, setLanguage } from '@/features/ui/uiSlice';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Navbar.module.css';
import { translations } from '@/data/translations';

const Navbar = () => {
    const dispatch = useDispatch();
    const isMobileMenuOpen = useSelector((state) => state.ui.isMobileMenuOpen);
    const currentLang = useSelector((state) => state.ui.language);
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, firstName } = useAuth();

    const t = translations.nav[currentLang] || translations.nav.en;
    const loginPath = '/login';
    const aanvraagPath = currentLang === 'nl' ? '/nl/aanvraag' : '/en/application';
    // When the user is authenticated, show their first name in place of the
    // login label. Falls back to a generic greeting if first name is missing.
    const authedLabel = firstName
        ? (currentLang === 'en' ? `Hi, ${firstName}` : `Hoi, ${firstName}`)
        : (currentLang === 'en' ? 'My Account' : 'Mijn Account');

    // Hide the login / "My Account" button when the user is already inside
    // the application flow (aanvraag / application / letter-of-intent), since
    // those pages already represent "being inside My Account".
    const lowerPath = (pathname || '').toLowerCase();
    const isInsideAccountFlow =
        lowerPath.includes('/aanvraag') ||
        lowerPath.includes('/application') ||
        lowerPath.includes('/letter-of-intent') ||
        lowerPath.includes('/intentieverklaring');
    const showLoginButton = !isInsideAccountFlow;

    const navLinks = [
        { name: t.rentOut, path: currentLang === 'nl' ? '/nl/rent-out' : '/en/rent-out' },
        { name: t.rentIn, path: currentLang === 'nl' ? '/nl/rent-in' : '/en/rent-in' },
        { name: t.faq, path: currentLang === 'nl' ? '/nl/faq' : '/en/faq' },
        { name: t.about, path: currentLang === 'nl' ? '/nl/about-us' : '/en/about-us' },
        { name: t.contact, path: currentLang === 'nl' ? '/nl/contact' : '/en/contact' },
    ];

    const mobileNavLinks = [
        ...navLinks,
    ];

    const handleLinkClick = () => {
        dispatch(closeMobileMenu());
        window.scrollTo(0, 0);
    };

    const [isLangOpen, setIsLangOpen] = useState(false);

    const toggleLang = () => setIsLangOpen(!isLangOpen);

    const selectLang = (lang) => {
        dispatch(setLanguage(lang));
        setIsLangOpen(false);

        // Handle URL update
        const currentPath = pathname;
        let newPath = currentPath;

        if (lang === 'nl') {
            if (currentPath === '/') {
                newPath = '/nl';
            } else if (currentPath.startsWith('/en/')) {
                newPath = currentPath.replace('/en/', '/nl/');
            } else if (!currentPath.startsWith('/nl/')) {
                if (currentPath === '/contact') newPath = '/nl/contact';
                else if (currentPath === '/tenants') newPath = '/nl/rent-in';
                else if (currentPath === '/landlords') newPath = '/nl/rent-out';
                else if (currentPath === '/neighborhoods') newPath = '/nl/neighborhoods';
                else if (currentPath === '/faq') newPath = '/nl/faq';
                else if (currentPath === '/about') newPath = '/nl/about-us';
                else if (currentPath === '/application' || currentPath.includes('/application')) newPath = '/nl/aanvraag';
            }
        } else {
            if (currentPath === '/nl') {
                newPath = '/';
            } else if (currentPath.startsWith('/nl/')) {
                if (currentPath.includes('/aanvraag')) {
                    newPath = '/en/application';
                } else {
                    newPath = currentPath.replace('/nl/', '/en/');
                }
            } else if (currentPath === '/aanvraag') {
                newPath = '/en/application';
            }
        }

        if (newPath !== currentPath) {
            router.push(newPath);
        }
    };

    const LanguageSwitcher = React.memo(() => (
        <div className={styles.languageContainer}>
            <button
                className={styles.languageButton}
                onClick={toggleLang}
                aria-label="Select language"
            >
                <span>{currentLang === 'en' ? '🇬🇧' : '🇳🇱'}</span>
            </button>
            {isLangOpen && (
                <div className={styles.languageDropdown}>
                    <button
                        className={`${styles.dropdownItem} ${currentLang === 'nl' ? styles.dropdownItemActive : ''}`}
                        onClick={() => selectLang('nl')}
                    >
                        <span>🇳🇱</span><span>Dutch</span>
                    </button>
                    <button
                        className={`${styles.dropdownItem} ${currentLang === 'en' ? styles.dropdownItemActive : ''}`}
                        onClick={() => selectLang('en')}
                    >
                        <span>🇬🇧</span><span>English</span>
                    </button>
                </div>
            )}
        </div>
    ));

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <div className={styles.navContent}>
                    <Link href={currentLang === 'nl' ? "/nl" : "/"} className={styles.logoWrapper}>
                        <div className={styles.logoIconWrapper}>
                            <img
                                src="/images/5a9afd14-27a5-40d8-a185-fac727f64fdf.png"
                                alt="ApartmentHub - Apartments for rent in Amsterdam, Netherlands"
                                className={styles.logoIcon}
                            />
                        </div>
                        <span className={styles.logoText}>ApartmentHub</span>
                    </Link>

                    <div className={styles.desktopMenu}>
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.path}
                                className={`${styles.navLink} ${pathname === link.path ? styles.activeNavLink : ''}`}
                                onClick={() => window.scrollTo(0, 0)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <LanguageSwitcher />
                        {showLoginButton && (
                            <Link
                                href={isAuthenticated ? aanvraagPath : loginPath}
                                className={styles.loginButton}
                                onClick={() => window.scrollTo(0, 0)}
                            >
                                <LogIn size={16} />
                                {isAuthenticated ? authedLabel : t.login}
                            </Link>
                        )}
                    </div>

                    <div className={styles.mobileActions}>
                        <LanguageSwitcher />
                        <button
                            className={styles.mobileMenuBtn}
                            onClick={() => dispatch(toggleMobileMenu())}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
                <div className={styles.mobileMenuContent}>
                    {mobileNavLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.path}
                            className={`${styles.mobileNavLink} ${pathname === link.path ? styles.active : ''}`}
                            onClick={handleLinkClick}
                        >
                            {link.name}
                        </Link>
                    ))}
                    {showLoginButton && (
                        <Link
                            href={isAuthenticated ? aanvraagPath : loginPath}
                            className={styles.mobileLoginButton}
                            onClick={handleLinkClick}
                        >
                            <LogIn size={16} />
                            {isAuthenticated ? authedLabel : t.login}
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
