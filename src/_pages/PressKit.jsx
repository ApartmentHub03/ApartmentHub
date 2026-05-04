'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import styles from './LegalPage.module.css';

const PressKit = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const isNL = currentLang !== 'en';
    const langPrefix = isNL ? '/nl' : '/en';

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>
                    {isNL ? 'Pers & Media Kit' : 'Press & Media Kit'}
                </h1>

                <p className={styles.intro}>
                    {isNL
                        ? 'Schrijft u een artikel over de Amsterdamse huurmarkt of over expats die in Nederland een woning zoeken? Op deze pagina vindt u alle informatie, citaten en merkmiddelen die u nodig heeft om naar ApartmentHub te verwijzen. Neem gerust contact met ons op voor interviews, data of aanvullende quotes.'
                        : 'Writing about the Amsterdam rental market or about expats looking for a home in the Netherlands? This page collects everything you need to reference ApartmentHub — boilerplate copy, quotable facts and brand assets. Reach out any time for interviews, data or additional quotes.'
                    }
                </p>

                {/* Boilerplate */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Over ApartmentHub (boilerplate)' : 'About ApartmentHub (boilerplate)'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL
                            ? 'ApartmentHub is een in Amsterdam gevestigd huurplatform dat huurders en verhuurders in Nederland verbindt. Via een gestroomlijnd online dossier, geverifieerde huurwoningen en transparante biedingen helpt ApartmentHub expats, professionals en gezinnen sneller een woning te vinden in heel Amsterdam — van het Centrum en de Grachtengordel tot Oud-Zuid, De Pijp, Oost en Noord.'
                            : 'ApartmentHub is an Amsterdam-based rental platform connecting tenants and landlords across the Netherlands. Through a streamlined online dossier, verified rental listings and transparent bidding, ApartmentHub helps expats, professionals and families find homes faster across Amsterdam — from Centrum and the canal belt to Oud-Zuid, De Pijp, Oost and Noord.'
                        }
                    </p>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Bij verwijzingen vragen wij journalisten en bloggers om te linken naar '
                            : 'When citing us, please link to '
                        }
                        <a href="https://apartmenthub.nl" className={styles.link}>https://apartmenthub.nl</a>
                        {isNL ? ' en het bedrijf te benoemen als ' : ' and refer to the company as '}
                        <strong>ApartmentHub</strong>
                        {isNL ? ' (één woord, twee hoofdletters).' : ' (one word, two capital letters).'}
                    </p>
                </section>

                {/* Key facts */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Kerngegevens' : 'Key Facts'}
                    </h2>
                    <ul className={styles.list}>
                        <li>{isNL ? 'Opgericht: 2019' : 'Founded: 2019'}</li>
                        <li>{isNL ? 'Hoofdkantoor: Amsterdam, Nederland' : 'Headquarters: Amsterdam, the Netherlands'}</li>
                        <li>{isNL ? 'Sector: vastgoed, huurwoningen, proptech' : 'Sector: real estate, rentals, proptech'}</li>
                        <li>{isNL ? 'Dekking: huurwoningen in heel Amsterdam en de Randstad' : 'Coverage: rental apartments across Amsterdam and the Randstad'}</li>
                        <li>{isNL ? 'Talen: Nederlands en Engels' : 'Languages: Dutch and English'}</li>
                        <li>{isNL ? 'KvK-nummer: 74255142' : 'Chamber of Commerce number: 74255142'}</li>
                    </ul>
                </section>

                {/* Quotable lines */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Citaten die u kunt gebruiken' : 'Quotes you can use'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL
                            ? '"De Amsterdamse huurmarkt is voor expats en jonge professionals één van de meest competitieve van Europa. Onze missie is om die markt eerlijker en transparanter te maken — geverifieerde advertenties, één digitaal dossier, geen huurderskosten." — ApartmentHub'
                            : '"Amsterdam\'s rental market is one of the most competitive in Europe for expats and young professionals. Our mission is to make it fairer and more transparent — verified listings, a single digital dossier, no tenant fees." — ApartmentHub'
                        }
                    </p>
                    <p className={styles.paragraph}>
                        {isNL
                            ? '"We zien dat huurders gemiddeld op meer dan tien woningen reageren voordat ze er één krijgen. Door het aanvraagproces te digitaliseren proberen wij die tijd drastisch te verkorten." — ApartmentHub'
                            : '"We see tenants apply to more than ten properties on average before securing one. By digitising the application process, we aim to cut that time dramatically." — ApartmentHub'
                        }
                    </p>
                </section>

                {/* Brand assets */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Merkmiddelen' : 'Brand Assets'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL
                            ? 'U mag het ApartmentHub logo gebruiken in redactionele context, mits het niet wordt aangepast, uitgerekt of in een misleidende setting wordt geplaatst. Klik met de rechtermuisknop op het logo hieronder om het op te slaan.'
                            : 'You may use the ApartmentHub logo in editorial context, provided it is not altered, stretched or placed in a misleading setting. Right-click the logo below to save.'
                        }
                    </p>
                    <p className={styles.paragraphSpaced}>
                        <a
                            href="/images/site-logo.png"
                            className={styles.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                        >
                            {isNL ? 'Download ApartmentHub logo (PNG, 512x512)' : 'Download ApartmentHub logo (PNG, 512x512)'}
                        </a>
                    </p>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Onze merkkleur is teal (#009B8A). Aanvullende creatieve assets zijn op aanvraag beschikbaar.'
                            : 'Our brand colour is teal (#009B8A). Additional creative assets are available on request.'
                        }
                    </p>
                </section>

                {/* Press contact */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Perscontact' : 'Press Contact'}
                    </h2>
                    <ul className={styles.contactList}>
                        <li>
                            {isNL ? 'E-mail: ' : 'Email: '}
                            <a href="mailto:info@apartmenthub.nl?subject=Press%20enquiry" className={styles.link}>
                                info@apartmenthub.nl
                            </a>
                        </li>
                        <li>
                            {isNL ? 'Onderwerpregel: ' : 'Subject line: '}
                            <em>{isNL ? '"Persvraag - [uw publicatie]"' : '"Press enquiry - [your publication]"'}</em>
                        </li>
                        <li>
                            LinkedIn:{' '}
                            <a href="https://www.linkedin.com/company/apartmenthub/" className={styles.link} target="_blank" rel="noopener noreferrer">
                                linkedin.com/company/apartmenthub
                            </a>
                        </li>
                        <li>
                            Instagram:{' '}
                            <a href="https://www.instagram.com/apartmenthub/" className={styles.link} target="_blank" rel="noopener noreferrer">
                                instagram.com/apartmenthub
                            </a>
                        </li>
                    </ul>
                </section>

                {/* Resources for linking */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Pagina\'s om naar te linken' : 'Pages worth linking to'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL
                            ? 'Schrijft u over een specifiek onderwerp? Deze pagina\'s bevatten diepgaande, citeerbare content over de Amsterdamse huurmarkt:'
                            : 'Writing about a specific topic? These pages contain in-depth, quotable content about the Amsterdam rental market:'
                        }
                    </p>
                    <ul className={styles.list}>
                        <li>
                            <Link href={`${langPrefix}/neighborhoods`} className={styles.link}>
                                {isNL
                                    ? 'Gids voor Amsterdamse wijken — huurprijzen en sfeer per buurt'
                                    : 'Amsterdam Neighborhoods Guide — rental prices and lifestyle per area'
                                }
                            </Link>
                        </li>
                        <li>
                            <Link href={`${langPrefix}/${isNL ? 'appartementen' : 'apartments'}`} className={styles.link}>
                                {isNL ? 'Actuele huurwoningen in Amsterdam' : 'Current Amsterdam apartments for rent'}
                            </Link>
                        </li>
                        <li>
                            <Link href={`${langPrefix}/rent-in`} className={styles.link}>
                                {isNL ? 'Hoe huren werkt voor huurders en expats' : 'How renting works for tenants and expats'}
                            </Link>
                        </li>
                        <li>
                            <Link href={`${langPrefix}/rent-out`} className={styles.link}>
                                {isNL ? 'Verhuren via ApartmentHub' : 'Renting out via ApartmentHub'}
                            </Link>
                        </li>
                        <li>
                            <Link href={`${langPrefix}/about-us`} className={styles.link}>
                                {isNL ? 'Over ApartmentHub' : 'About ApartmentHub'}
                            </Link>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default PressKit;
