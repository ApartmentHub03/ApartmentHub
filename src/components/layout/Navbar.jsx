'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, X, ChevronDown } from 'lucide-react';
import { toggleMobileMenu, closeMobileMenu, setLanguage, setCity, openCityModal, closeCityModal } from '@/features/ui/uiSlice';
import { AmsterdamFlag, UtrechtFlag } from './CityFlags';
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

    const t = translations.nav[currentLang] || translations.nav.en;

    const city = useSelector((state) => state.ui.city);
    const showCityModal = useSelector((state) => state.ui.showCityModal);
    const [cityReady, setCityReady] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('ah_city');
            const exp = localStorage.getItem('ah_city_exp');
            if (stored && exp && Date.now() <= Number(exp)) {
                dispatch(setCity(stored));
            } else {
                localStorage.removeItem('ah_city');
                localStorage.removeItem('ah_city_exp');
                dispatch(openCityModal());
            }
        } catch {
            dispatch(openCityModal());
        }
        setCityReady(true);
    }, [dispatch]);

    const cityLabel = city === 'utrecht'
        ? t.middenNederland
        : t.amsterdam;

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
                        <button
                            className={styles.cityButton}
                            onClick={() => dispatch(openCityModal())}
                            aria-label={t.selectCity}
                        >
                            <span className={styles.cityIcon}>{city === 'utrecht' ? '📍' : '🎈'}</span>
                            {cityReady && <span>{cityLabel}</span>}
                            <span className={styles.cityChevron}><ChevronDown size={13} /></span>
                        </button>
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
                    <button
                        className={styles.mobileCityButton}
                        onClick={() => { dispatch(openCityModal()); handleLinkClick(); }}
                    >
                        <span className={styles.cityIcon}>{city === 'utrecht' ? '📍' : '🎈'}</span>
                        {cityReady && <span>{cityLabel}</span>}
                        <span className={styles.cityChevron}><ChevronDown size={13} /></span>
                    </button>
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

            {cityReady && showCityModal && (
                <div className={styles.cityModalOverlay} onClick={() => dispatch(closeCityModal())}>
                    <div className={styles.cityModal} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.cityModalTitle}>{t.cityModalTitle}</h2>
                        <p className={styles.cityModalSubtitle}>{t.cityModalSubtitle}</p>
                        <div className={styles.cityCards}>
                            <button
                                className={`${styles.cityCard} ${city === 'amsterdam' ? styles.cityCardActive : ''}`}
                                onClick={() => dispatch(setCity('amsterdam'))}
                            >
                                <div className={styles.cityCardFlag}>
                                    <AmsterdamFlag className={styles.cityFlag} />
                                </div>
                                <div className={styles.cityCardInfo}>
                                    <span className={styles.cityCardName}>{t.amsterdam}</span>
                                    <span className={styles.cityCardRegion}>NL</span>
                                </div>
                            </button>
                            <button
                                className={`${styles.cityCard} ${city === 'utrecht' ? styles.cityCardActive : ''}`}
                                onClick={() => dispatch(setCity('utrecht'))}
                            >
                                <div className={styles.cityCardFlag}>
                                    <UtrechtFlag className={styles.cityFlag} />
                                </div>
                                <div className={styles.cityCardInfo}>
                                    <span className={styles.cityCardName}>{t.middenNederland}</span>
                                    <span className={styles.cityCardRegion}>{t.middenNederlandSub}</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
