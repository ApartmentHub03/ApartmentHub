'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, X, LogIn, ChevronDown } from 'lucide-react';
import { toggleMobileMenu, closeMobileMenu, setLanguage } from '@/features/ui/uiSlice';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Navbar.module.css';
import { translations } from '@/data/translations';

// Slug pairs whose Dutch and English forms differ. Anything not listed
// passes through unchanged (e.g. /faq, /contact, /signup).
const SLUG_PAIRS = [
    ['application', 'aanvraag'],
    ['apartments', 'appartementen'],
    ['letter-of-intent', 'intentieverklaring'],
    ['terms-and-conditions', 'algemene-voorwaarden'],
    ['privacy-policy', 'privacyverklaring'],
    ['buy', 'koop'],
    ['sell', 'verkoop'],
    ['valuation', 'waardebepaling'],
    ['buy/buying-power', 'koop/koopkracht'],
    ['buy-lead', 'koop-lead'],
    ['terms-and-conditions', 'algemene-voorwaarden'],
];
const EN_TO_NL = Object.fromEntries(SLUG_PAIRS);
const NL_TO_EN = Object.fromEntries(SLUG_PAIRS.map(([en, nl]) => [nl, en]));

// Un-prefixed root paths (default-language pages without /nl/ prefix).
const LEGACY_TO_LOCALE = {
    '/aanvraag': { en: '/en/application', nl: '/nl/aanvraag' },
    '/appartementen': { en: '/en/apartments', nl: '/nl/appartementen' },
    '/application': { en: '/en/application', nl: '/nl/aanvraag' },
    '/tenants': { en: '/en/rent-in', nl: '/nl/rent-in' },
    '/landlords': { en: '/en/rent-out', nl: '/nl/rent-out' },
    '/neighborhoods': { en: '/en/neighborhoods', nl: '/nl/neighborhoods' },
    '/faq': { en: '/en/faq', nl: '/nl/faq' },
    '/about': { en: '/en/about-us', nl: '/nl/about-us' },
    '/contact': { en: '/en/contact', nl: '/nl/contact' },
    '/verkoop': { en: '/en/sell', nl: '/verkoop' },
    '/waardebepaling': { en: '/en/valuation', nl: '/waardebepaling' },
};

// Translate a path between /en/ and /nl/, mapping the first segment via SLUG_PAIRS.
// Falls through unchanged for paths that don't carry a locale prefix and aren't legacy.
// Root-level NL pages (e.g. /verkoop) use ROOT_NL_MAP so /en/sell ↔ /verkoop works.
const ROOT_NL_MAP = {
    verkoop: '/verkoop',
    waardebepaling: '/waardebepaling',
};
const ROOT_NL_TO_EN = {
    '/verkoop': '/en/sell',
    '/waardebepaling': '/en/valuation',
};

const translatePath = (currentPath, targetLang) => {
    if (!currentPath) return currentPath;

    if (currentPath === '/' && targetLang === 'nl') return '/nl';
    if (currentPath === '/nl' && targetLang === 'en') return '/';

    const legacy = LEGACY_TO_LOCALE[currentPath];
    if (legacy) return legacy[targetLang] || currentPath;

    // Root-level NL pages (e.g. /verkoop) — switch to their EN counterpart
    if (ROOT_NL_TO_EN[currentPath] && targetLang === 'en') {
        return ROOT_NL_TO_EN[currentPath];
    }

    const localeMatch = currentPath.match(/^\/(en|nl)(\/(.*))?$/);
    if (!localeMatch) return currentPath;

    const sourceLang = localeMatch[1];
    const rest = localeMatch[3] || '';
    if (sourceLang === targetLang) return currentPath;

    if (!rest) return targetLang === 'en' ? '/' : '/nl';

    const segments = rest.split('/');
    const dict = sourceLang === 'en' ? EN_TO_NL : NL_TO_EN;
    if (segments[0] && dict[segments[0]]) {
        segments[0] = dict[segments[0]];
    }

    // When switching from EN to NL, some pages should be root-level (no /nl/ prefix)
    if (targetLang === 'nl' && segments.length === 1 && ROOT_NL_MAP[segments[0]]) {
        return ROOT_NL_MAP[segments[0]];
    }

    return `/${targetLang}/${segments.join('/')}`;
};

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

    const mainLinks = [
        { name: t.rentOut, path: currentLang === 'nl' ? '/nl/rent-out' : '/en/rent-out' },
        { name: t.rentIn,  path: currentLang === 'nl' ? '/nl/rent-in'  : '/en/rent-in'  },
        { name: t.buy,     path: currentLang === 'nl' ? '/nl/koop'     : '/en/buy'      },
        { name: t.sell,    path: currentLang === 'nl' ? '/verkoop' : '/en/sell' },
    ];

    const sideLinks = [
        { name: t.faq,     path: currentLang === 'nl' ? '/nl/faq'     : '/en/faq'       },
        { name: t.about,   path: currentLang === 'nl' ? '/nl/about-us' : '/en/about-us'  },
        { name: t.contact, path: currentLang === 'nl' ? '/nl/contact'  : '/en/contact'   },
    ];

    const mobileNavLinks = [
        ...mainLinks,
    ];

    const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
    const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

    const handleLinkClick = () => {
        dispatch(closeMobileMenu());
        setIsSideMenuOpen(false);
        setIsMobileMoreOpen(false);
        window.scrollTo(0, 0);
    };

    const [isLangOpen, setIsLangOpen] = useState(false);

    const toggleLang = () => setIsLangOpen(!isLangOpen);

    const selectLang = (lang) => {
        dispatch(setLanguage(lang));
        setIsLangOpen(false);

        const currentPath = pathname;
        const newPath = translatePath(currentPath, lang);

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
                                alt="ApartmentHub Logo"
                                className={styles.logoIcon}
                            />
                        </div>
                        <span className={styles.logoText}>ApartmentHub</span>
                    </Link>

                    <div className={styles.desktopMenu}>
                        {mainLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.path}
                                className={`${styles.navLink} ${pathname === link.path ? styles.activeNavLink : ''}`}
                                onClick={() => window.scrollTo(0, 0)}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <div className={styles.desktopActions}>
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
                        <button
                            className={`${styles.moreButton} ${isSideMenuOpen ? styles.moreButtonActive : ''}`}
                            onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
                            aria-label="More links"
                        >
                            <Menu size={22} />
                        </button>
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
                    <div className={styles.mobileMoreSection}>
                        <button
                            className={styles.mobileMoreToggle}
                            onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
                        >
                            {t.more}
                            <ChevronDown size={16} className={`${styles.moreChevron} ${isMobileMoreOpen ? styles.moreChevronOpen : ''}`} />
                        </button>
                        <div className={`${styles.mobileMoreContent} ${isMobileMoreOpen ? styles.mobileMoreContentOpen : ''}`}>
                            {sideLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.path}
                                    className={`${styles.mobileNavLink} ${pathname === link.path ? styles.active : ''}`}
                                    onClick={handleLinkClick}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>
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

            {/* Desktop Side Menu Drawer */}
            {isSideMenuOpen && (
                <div className={styles.sideMenuOverlay} onClick={() => setIsSideMenuOpen(false)} />
            )}
            <div className={`${styles.sideMenu} ${isSideMenuOpen ? styles.sideMenuOpen : ''}`}>
                <div className={styles.sideMenuHeader}>
                    <span className={styles.sideMenuTitle}>{t.more}</span>
                    <button
                        className={styles.sideMenuClose}
                        onClick={() => setIsSideMenuOpen(false)}
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>
                <nav className={styles.sideMenuNav}>
                    {sideLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.path}
                            className={`${styles.sideMenuLink} ${pathname === link.path ? styles.sideMenuLinkActive : ''}`}
                            onClick={() => { setIsSideMenuOpen(false); window.scrollTo(0, 0); }}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>
            </div>
        </nav>
    );
};

export default Navbar;
