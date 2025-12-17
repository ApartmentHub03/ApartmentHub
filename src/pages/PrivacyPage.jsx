import React from 'react';
import { useSelector } from 'react-redux';
import styles from './LegalPage.module.css';

const PrivacyPolicy = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const isNL = currentLang !== 'en';

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>
                    {isNL ? 'Privacyverklaring' : 'Privacy Policy'}
                </h1>

                <p className={styles.version}>
                    {isNL ? 'Versie: Oktober 2025' : 'Version: October 2025'}
                </p>

                <p className={styles.intro}>
                    {isNL
                        ? 'Apartmenthub, gevestigd aan Van Baerlestraat 62-2, 1071 BA Amsterdam, Nederland, is verantwoordelijk voor de verwerking van persoonsgegevens zoals weergegeven in deze privacyverklaring.'
                        : 'Apartmenthub, located at Van Baerlestraat 62-2, 1071 BA Amsterdam, The Netherlands, is responsible for the processing of personal data as shown in this privacy policy.'
                    }
                </p>

                {/* Contact Details */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Contactgegevens' : 'Contact Details'}
                    </h2>
                    <ul className={styles.contactList}>
                        <li>{isNL ? 'KvK-nummer' : 'Chamber of Commerce number'}: 74255142</li>
                        <li>Website: www.apartmenthub.com</li>
                        <li>{isNL ? 'E-mailadres' : 'Email address'}: hello@apartmenthub.nl</li>
                        <li>{isNL ? 'Adres' : 'Address'}: Van Baerlestraat 62-2, 1071 BA Amsterdam</li>
                    </ul>
                </section>

                {/* Personal Data We Process */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Persoonsgegevens die wij verwerken' : 'Personal Data We Process'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL
                            ? 'Apartmenthub verwerkt uw persoonsgegevens doordat u gebruik maakt van onze diensten en/of omdat u deze zelf aan ons verstrekt. Hieronder vindt u een overzicht van de persoonsgegevens die wij verwerken:'
                            : 'Apartmenthub processes your personal data because you use our services and/or because you provide them to us. Below is an overview of the personal data we process:'
                        }
                    </p>
                    <ul className={styles.list}>
                        <li>{isNL ? 'Voor- en achternaam' : 'First and last name'}</li>
                        <li>{isNL ? 'Geboortedatum' : 'Date of birth'}</li>
                        <li>{isNL ? 'Geboorteplaats' : 'Place of birth'}</li>
                        <li>{isNL ? 'Adresgegevens' : 'Address details'}</li>
                        <li>{isNL ? 'Telefoonnummer' : 'Phone number'}</li>
                        <li>{isNL ? 'E-mailadres' : 'Email address'}</li>
                        <li>
                            {isNL
                                ? 'Overige persoonsgegevens die u actief verstrekt, bijvoorbeeld bij het aanmaken van een profiel op onze website, in correspondentie of telefonisch'
                                : 'Other personal data you actively provide, for example when creating a profile on our website, in correspondence or by phone'
                            }
                        </li>
                        <li>{isNL ? 'Gegevens over uw activiteiten op onze website' : 'Data about your activities on our website'}</li>
                        <li>{isNL ? 'IP-adres' : 'IP address'}</li>
                        <li>{isNL ? 'Internetbrowser en apparaat type' : 'Internet browser and device type'}</li>
                        <li>
                            {isNL
                                ? 'Gegevens met betrekking tot uw interactie met onze WhatsApp AI-Chatbot'
                                : 'Data relating to your interaction with our WhatsApp AI Chatbot'
                            }
                        </li>
                    </ul>
                </section>

                {/* Special/Sensitive Data */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Bijzondere en/of gevoelige persoonsgegevens die wij verwerken' : 'Special and/or Sensitive Personal Data We Process'}
                    </h2>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Apartmenthub verwerkt de volgende bijzondere en/of gevoelige persoonsgegevens van u:'
                            : 'Apartmenthub processes the following special and/or sensitive personal data from you:'
                        }
                    </p>
                    <p className={styles.paragraphMt}>
                        {isNL
                            ? 'Burgerservicenummer (BSN), indien dit noodzakelijk is voor een huurovereenkomst of identificatieplicht.'
                            : 'Citizen Service Number (BSN), if necessary for a rental agreement or identification requirement.'
                        }
                    </p>
                </section>

                {/* Purposes and Legal Bases */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Doeleinden en grondslagen voor de verwerking' : 'Purposes and Legal Bases for Processing'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL
                            ? 'Apartmenthub verwerkt uw persoonsgegevens voor de volgende doeleinden:'
                            : 'Apartmenthub processes your personal data for the following purposes:'
                        }
                    </p>
                    <ul className={styles.list}>
                        <li>
                            {isNL
                                ? 'Het afhandelen van uw betaling (grondslag: uitvoering van een overeenkomst)'
                                : 'Processing your payment (legal basis: performance of a contract)'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'U te kunnen bellen of e-mailen indien dit nodig is om onze dienstverlening uit te voeren (grondslag: uitvoering van een overeenkomst)'
                                : 'Calling or emailing you if necessary to provide our services (legal basis: performance of a contract)'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'U de mogelijkheid te bieden een account aan te maken (grondslag: toestemming)'
                                : 'Allowing you to create an account (legal basis: consent)'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'Het leveren van goederen en diensten (grondslag: uitvoering van een overeenkomst)'
                                : 'Delivering goods and services (legal basis: performance of a contract)'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'Het analyseren van uw gedrag op de website om deze te verbeteren en het aanbod af te stemmen op uw voorkeuren (grondslag: gerechtvaardigd belang)'
                                : 'Analyzing your behavior on the website to improve it and tailor the offer to your preferences (legal basis: legitimate interest)'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'Het gebruik van een WhatsApp AI-Chatbot om u snel te kunnen helpen (grondslag: toestemming)'
                                : 'Using a WhatsApp AI Chatbot to help you quickly (legal basis: consent)'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'Het nakomen van wettelijke verplichtingen, zoals fiscale administratie (grondslag: wettelijke verplichting)'
                                : 'Complying with legal obligations, such as tax administration (legal basis: legal obligation)'
                            }
                        </li>
                    </ul>
                </section>

                {/* WhatsApp AI Chatbot */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Gebruik van de WhatsApp AI-Chatbot' : 'Use of WhatsApp AI Chatbot'}
                    </h2>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Wanneer u contact opneemt via WhatsApp, worden de door u verstrekte gegevens gebruikt om u te helpen met uw vragen of verzoeken. Dit omvat onder andere uw naam, telefoonnummer en de inhoud van het gesprek. Door gebruik te maken van deze dienst geeft u toestemming voor deze gegevensverwerking.'
                            : 'When you contact us via WhatsApp, the information you provide is used to help you with your questions or requests. This includes your name, phone number and the content of the conversation. By using this service, you consent to this data processing.'
                        }
                    </p>
                </section>

                {/* Retention Periods */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Bewaartermijnen' : 'Retention Periods'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL
                            ? 'Apartmenthub bewaart uw persoonsgegevens niet langer dan strikt nodig is om de doelen te realiseren waarvoor uw gegevens zijn verzameld.'
                            : 'Apartmenthub does not retain your personal data longer than strictly necessary to achieve the purposes for which your data was collected.'
                        }
                    </p>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th className={styles.tableHeader}>
                                        {isNL ? 'Categorie gegevens' : 'Data Category'}
                                    </th>
                                    <th className={styles.tableHeader}>
                                        {isNL ? 'Bewaartermijn' : 'Retention Period'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tableRow}>
                                    <td className={styles.tableCell}>{isNL ? 'Voor- en achternaam' : 'First and last name'}</td>
                                    <td className={styles.tableCell}>{isNL ? '6 maanden na voltooiing van uw zoekopdracht' : '6 months after completion of your search'}</td>
                                </tr>
                                <tr className={styles.tableRowAlt}>
                                    <td className={styles.tableCell}>{isNL ? 'Adresgegevens' : 'Address details'}</td>
                                    <td className={styles.tableCell}>{isNL ? '6 maanden na voltooiing van uw zoekopdracht' : '6 months after completion of your search'}</td>
                                </tr>
                                <tr className={styles.tableRow}>
                                    <td className={styles.tableCell}>{isNL ? 'E-mailadres' : 'Email address'}</td>
                                    <td className={styles.tableCell}>{isNL ? '6 maanden na voltooiing van uw zoekopdracht' : '6 months after completion of your search'}</td>
                                </tr>
                                <tr className={styles.tableRowAlt}>
                                    <td className={styles.tableCell}>{isNL ? 'Telefoonnummer' : 'Phone number'}</td>
                                    <td className={styles.tableCell}>{isNL ? '6 maanden na voltooiing van uw zoekopdracht' : '6 months after completion of your search'}</td>
                                </tr>
                                <tr className={styles.tableRow}>
                                    <td className={styles.tableCell}>BSN</td>
                                    <td className={styles.tableCell}>
                                        {isNL
                                            ? '6 maanden, tenzij wettelijke verplichting tot langere bewaartijd'
                                            : '6 months, unless legal obligation requires longer retention'
                                        }
                                    </td>
                                </tr>
                                <tr className={styles.tableRowAlt}>
                                    <td className={styles.tableCell}>
                                        {isNL ? 'Geboortedatum en geboorteplaats' : 'Date and place of birth'}
                                    </td>
                                    <td className={styles.tableCell}>{isNL ? '6 maanden na voltooiing van uw zoekopdracht' : '6 months after completion of your search'}</td>
                                </tr>
                                <tr className={styles.tableRow}>
                                    <td className={styles.tableCell}>
                                        {isNL ? 'Chatgegevens via WhatsApp AI-Chatbot' : 'Chat data via WhatsApp AI Chatbot'}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {isNL ? '3 maanden na de laatste interactie' : '3 months after last interaction'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Sharing with Third Parties */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Delen van persoonsgegevens met derden' : 'Sharing Personal Data with Third Parties'}
                    </h2>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Apartmenthub verstrekt uw persoonsgegevens uitsluitend aan derden als dit nodig is voor de uitvoering van onze overeenkomst met u of om te voldoen aan een wettelijke verplichting. Wij kunnen desgevraagd aantonen dat het delen van gegevens met derden noodzakelijk is voor het betreffende doel.'
                            : 'Apartmenthub only provides your personal data to third parties if necessary for the execution of our agreement with you or to comply with a legal obligation. We can demonstrate upon request that sharing data with third parties is necessary for the purpose in question.'
                        }
                    </p>
                </section>

                {/* Cookies */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Cookies en vergelijkbare technieken' : 'Cookies and Similar Technologies'}
                    </h2>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Apartmenthub gebruikt functionele, analytische en tracking cookies. Cookies zorgen ervoor dat de website goed werkt, uw voorkeuren worden onthouden en wij ons aanbod kunnen afstemmen op uw gedrag.'
                            : 'Apartmenthub uses functional, analytical and tracking cookies. Cookies ensure that the website works properly, your preferences are remembered and we can tailor our offer to your behavior.'
                        }
                    </p>
                    <p className={styles.paragraphMt}>
                        {isNL
                            ? 'U kunt cookies uitschakelen via de instellingen van uw browser. Ook kunt u eerder opgeslagen cookies verwijderen.'
                            : 'You can disable cookies via your browser settings. You can also delete previously stored cookies.'
                        }
                    </p>
                </section>

                {/* Your Rights */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Uw rechten' : 'Your Rights'}
                    </h2>
                    <p className={styles.paragraphSpaced}>
                        {isNL ? 'U heeft het recht om:' : 'You have the right to:'}
                    </p>
                    <ul className={styles.list}>
                        <li>
                            {isNL
                                ? 'uw persoonsgegevens in te zien, te corrigeren of te verwijderen;'
                                : 'view, correct or delete your personal data;'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'uw toestemming voor gegevensverwerking in te trekken;'
                                : 'withdraw your consent for data processing;'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'bezwaar te maken tegen verwerking;'
                                : 'object to processing;'
                            }
                        </li>
                        <li>
                            {isNL
                                ? 'gegevensoverdraagbaarheid aan te vragen.'
                                : 'request data portability.'
                            }
                        </li>
                    </ul>
                    <p className={styles.paragraphMt}>
                        {isNL
                            ? 'U kunt een verzoek indienen via e-mail: '
                            : 'You can submit a request via email: '
                        }
                        <a href="mailto:hello@apartmenthub.nl" className={styles.link}>hello@apartmenthub.nl</a>.
                    </p>
                    <p className={styles.paragraphMt}>
                        {isNL
                            ? 'Om uw identiteit te verifiëren, vragen wij u een kopie van uw identiteitsbewijs mee te sturen, waarbij uw pasfoto, MRZ, paspoortnummer en BSN zwart zijn gemaakt. Wij reageren binnen vier weken op uw verzoek.'
                            : 'To verify your identity, we ask you to send a copy of your identity document with your photo, MRZ, passport number and BSN blacked out. We will respond to your request within four weeks.'
                        }
                    </p>
                </section>

                {/* Security */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {isNL ? 'Beveiliging van persoonsgegevens' : 'Security of Personal Data'}
                    </h2>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Apartmenthub neemt passende technische en organisatorische maatregelen om misbruik, verlies, onbevoegde toegang, ongewenste openbaarmaking of ongeoorloofde wijziging van uw gegevens te voorkomen. Denkt u dat uw gegevens niet goed beveiligd zijn of vermoedt u misbruik? Neem dan contact op via '
                            : 'Apartmenthub takes appropriate technical and organizational measures to prevent misuse, loss, unauthorized access, unwanted disclosure or unauthorized modification of your data. If you think your data is not properly secured or suspect misuse, please contact us at '
                        }
                        <a href="mailto:hello@apartmenthub.nl" className={styles.link}>hello@apartmenthub.nl</a>.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
