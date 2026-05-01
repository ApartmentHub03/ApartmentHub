'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import styles from './ApartmentsSEOContent.module.css';

const content = {
    en: {
        eyebrow: 'Renting in Amsterdam',
        title: 'Your guide to renting an apartment in Amsterdam',
        lead: 'Whether you are searching for your first studio in De Pijp, a one-bedroom near Vondelpark, or a family apartment in Oost, this guide explains what to expect when you rent an apartment in Amsterdam — from typical prices and required documents to viewing etiquette and contract terms.',

        types: {
            title: 'Apartment types you will find on ApartmentHub',
            intro: 'Amsterdam apartments come in a wide range of formats, each suited to a different stage of life. Here is what you will see most often when browsing apartments for rent in Amsterdam:',
            items: [
                {
                    name: 'Studios (25 – 45 m²)',
                    text: 'Compact, self-contained apartments with one combined living and sleeping space, a private bathroom, and a kitchenette. Popular with students, single professionals, and short-term residents who want to live close to the center.',
                },
                {
                    name: 'One-bedroom apartments (45 – 70 m²)',
                    text: 'A separate bedroom plus a living room — the most common format for couples and individuals who work from home. Found across every neighborhood, from canal-belt apartments in Centrum to modern builds in Noord.',
                },
                {
                    name: 'Two-bedroom apartments (60 – 95 m²)',
                    text: 'A second bedroom that can serve as a home office, nursery, or guest room. Often the entry point for young families or couples who plan to stay in Amsterdam for several years.',
                },
                {
                    name: 'Family apartments and townhouses (95 m² and up)',
                    text: 'Three or more bedrooms, sometimes with a garden or rooftop terrace. Most common in Oud-Zuid, Oost, and IJburg, and ideal for families relocating to the Netherlands.',
                },
                {
                    name: 'Furnished and short-stay rentals',
                    text: 'Fully furnished apartments with a flexible 6 – 12 month lease — perfect for expats arriving on a new job contract who do not yet want to ship furniture.',
                },
                {
                    name: 'Unfurnished long-term rentals',
                    text: 'Empty apartments rented for indefinite periods. These offer the best value per square meter and the strongest tenant protection under Dutch law.',
                },
            ],
        },

        prices: {
            title: 'How much does it cost to rent an apartment in Amsterdam?',
            body: 'Rental prices vary by neighborhood, condition, and whether the apartment is furnished. Use the following ranges as a baseline before filtering listings on ApartmentHub:',
            bullets: [
                'Studios: €1,500 – €2,200 per month',
                'One-bedroom apartments: €2,000 – €2,800 per month',
                'Two-bedroom apartments: €2,800 – €3,800 per month',
                'Three-bedroom and family apartments: €3,500 – €5,500 per month',
                'Furnished apartments typically add 10 – 25% to the monthly rent',
                'Service costs (gas, water, electricity, internet) usually add €100 – €250 per month if not included',
            ],
            footer: 'Most landlords ask for one or two months of rent as deposit, paid before move-in. ApartmentHub never charges tenants courtage (agent fees) — what you see on the listing is what you pay.',
        },

        documents: {
            title: 'Documents you need to rent an apartment in Amsterdam',
            intro: 'A complete tenant dossier dramatically increases your chances of being selected. Most landlords in Amsterdam ask for:',
            items: [
                'A valid passport or EU/EEA ID card',
                'Your employment contract or letter of intent from your employer',
                'The three most recent payslips (or your latest annual statement if self-employed)',
                'A bank statement showing salary deposits, or proof of savings',
                'A motivation letter introducing yourself and your situation',
                'For freelancers: a recent KvK extract and the latest tax return',
                'For students or first-time renters: a guarantor statement and the guarantor’s payslips',
            ],
            footer: 'Upload these once when you build your dossier on ApartmentHub and reuse them for every application — no need to email them separately to each landlord.',
        },

        tips: {
            title: 'Tips for finding the right apartment in Amsterdam',
            items: [
                {
                    name: 'Set realistic expectations on size',
                    text: 'Amsterdam apartments are often smaller than equivalent rentals in other European capitals. A 60 m² one-bedroom is considered generous for a young couple in the city center.',
                },
                {
                    name: 'Decide on your maximum commute',
                    text: 'Amsterdam is bike-friendly: 20 minutes by bike covers most of the city. If you work near Zuidas, neighborhoods like Oud-Zuid and Buitenveldert make sense; if you commute to Schiphol, Nieuw-West and Slotervaart are well-connected.',
                },
                {
                    name: 'Apply quickly when a listing matches',
                    text: 'High-demand apartments often receive multiple applications within 24 hours. Having your dossier ready means you can submit a strong offer the moment a listing goes live.',
                },
                {
                    name: 'Read the lease carefully',
                    text: 'Dutch rental contracts can be indefinite or temporary (typically 12 or 24 months). Indefinite leases give you stronger protection, while temporary leases may suit short assignments — pay attention to the contract type before signing.',
                },
                {
                    name: 'Plan for registration',
                    text: 'Most landlords allow you to register your address with the gemeente (municipality), which is required for opening a Dutch bank account, getting a BSN, and signing up for healthcare.',
                },
            ],
        },

        why: {
            title: 'Why renters choose ApartmentHub for apartments for rent in Amsterdam',
            body: 'ApartmentHub is built for tenants. Every apartment is verified by our team before going live, your dossier is securely stored and reused across applications, and our local rental specialists are available on WhatsApp to answer questions in English or Dutch. We handle viewings, negotiations, and digital lease signing end-to-end — so you can focus on settling into your new Amsterdam home.',
        },
    },

    nl: {
        eyebrow: 'Huren in Amsterdam',
        title: 'Jouw gids voor het huren van een appartement in Amsterdam',
        lead: 'Of je nu zoekt naar je eerste studio in De Pijp, een eenkamerappartement bij het Vondelpark of een gezinswoning in Oost — deze gids legt uit wat je kunt verwachten bij het huren van een appartement in Amsterdam: van gemiddelde prijzen en benodigde documenten tot bezichtigingsetiquette en contractvoorwaarden.',

        types: {
            title: 'Welke appartementen vind je op ApartmentHub?',
            intro: 'Amsterdamse appartementen zijn er in alle soorten en maten. Dit zijn de meest voorkomende vormen die je tegenkomt bij appartementen te huur in Amsterdam:',
            items: [
                {
                    name: 'Studio’s (25 – 45 m²)',
                    text: 'Compacte, zelfstandige appartementen met een gecombineerde woon- en slaapkamer, eigen badkamer en een kitchenette. Populair bij studenten, alleenstaande professionals en korte verblijven dichtbij het centrum.',
                },
                {
                    name: 'Eenkamerappartementen (45 – 70 m²)',
                    text: 'Een aparte slaapkamer en woonkamer — de meest gangbare indeling voor stellen en thuiswerkers. In elke wijk te vinden, van grachtenpanden in Centrum tot nieuwbouw in Noord.',
                },
                {
                    name: 'Tweekamerappartementen (60 – 95 m²)',
                    text: 'Een tweede slaapkamer die dienst kan doen als thuiskantoor, kinderkamer of logeerkamer. Vaak de eerste stap voor jonge gezinnen of stellen die meerdere jaren in Amsterdam blijven.',
                },
                {
                    name: 'Gezinsappartementen en stadshuizen (vanaf 95 m²)',
                    text: 'Drie of meer slaapkamers, soms met tuin of dakterras. Vooral in Oud-Zuid, Oost en IJburg en geliefd bij gezinnen die naar Nederland verhuizen.',
                },
                {
                    name: 'Gemeubileerde en short-stay woningen',
                    text: 'Volledig gemeubileerde appartementen met een flexibel 6 – 12 maanden contract — ideaal voor expats die net beginnen aan een nieuw contract en nog geen meubels willen verschepen.',
                },
                {
                    name: 'Ongemeubileerde langetermijnhuur',
                    text: 'Lege appartementen voor onbepaalde tijd. Bieden de beste prijs per vierkante meter en de sterkste huurbescherming volgens Nederlands recht.',
                },
            ],
        },

        prices: {
            title: 'Wat kost het huren van een appartement in Amsterdam?',
            body: 'Huurprijzen variëren per wijk, staat van onderhoud en of de woning gemeubileerd is. Gebruik onderstaande richtlijnen voordat je begint te filteren op ApartmentHub:',
            bullets: [
                'Studio’s: €1.500 – €2.200 per maand',
                'Eenkamerappartementen: €2.000 – €2.800 per maand',
                'Tweekamerappartementen: €2.800 – €3.800 per maand',
                'Drie- en meerkamerappartementen: €3.500 – €5.500 per maand',
                'Gemeubileerde woningen kosten doorgaans 10 – 25% extra per maand',
                'Servicekosten (gas, water, licht, internet) tellen vaak €100 – €250 per maand op als ze niet zijn inbegrepen',
            ],
            footer: 'De meeste verhuurders vragen één tot twee maanden huur als borg, te betalen vóór oplevering. ApartmentHub rekent nooit courtage aan huurders — de prijs op de advertentie is de prijs die je betaalt.',
        },

        documents: {
            title: 'Welke documenten heb je nodig om in Amsterdam te huren?',
            intro: 'Een compleet huurdersdossier vergroot je kansen om geselecteerd te worden aanzienlijk. De meeste Amsterdamse verhuurders vragen om:',
            items: [
                'Een geldig paspoort of EU/EER-identiteitskaart',
                'Je arbeidscontract of intentieverklaring van je werkgever',
                'De drie meest recente salarisstroken (of jaaropgave als je zzp’er bent)',
                'Een bankafschrift met salarisstortingen of bewijs van spaargeld',
                'Een motivatiebrief waarin je jezelf en je situatie introduceert',
                'Voor zzp’ers: een recent KvK-uittreksel en de laatste belastingaangifte',
                'Voor studenten of starters: een garantsteller en de salarisstroken van die garantsteller',
            ],
            footer: 'Upload deze eenmalig in je dossier op ApartmentHub en hergebruik ze voor elke aanvraag — je hoeft ze niet apart per e-mail naar elke verhuurder te sturen.',
        },

        tips: {
            title: 'Tips voor het vinden van het juiste appartement in Amsterdam',
            items: [
                {
                    name: 'Wees realistisch over de grootte',
                    text: 'Amsterdamse appartementen zijn vaak kleiner dan vergelijkbare huurwoningen in andere Europese hoofdsteden. Een eenkamerappartement van 60 m² geldt als ruim voor een jong stel in het centrum.',
                },
                {
                    name: 'Bepaal je maximale reistijd',
                    text: 'Amsterdam is fietsvriendelijk: binnen 20 minuten op de fiets bestrijk je het grootste deel van de stad. Werk je op de Zuidas, dan zijn Oud-Zuid en Buitenveldert logisch; pendel je naar Schiphol, dan liggen Nieuw-West en Slotervaart goed.',
                },
                {
                    name: 'Reageer snel op een passende advertentie',
                    text: 'Populaire appartementen krijgen vaak meerdere aanvragen binnen 24 uur. Met een kant-en-klaar dossier kun je direct een sterk bod uitbrengen zodra een woning live gaat.',
                },
                {
                    name: 'Lees het huurcontract zorgvuldig',
                    text: 'Nederlandse huurcontracten zijn voor onbepaalde tijd of tijdelijk (meestal 12 of 24 maanden). Onbepaalde tijd geeft je sterkere bescherming; tijdelijke contracten passen bij korte uitzendingen — let goed op het contracttype voordat je tekent.',
                },
                {
                    name: 'Houd rekening met inschrijving bij de gemeente',
                    text: 'De meeste verhuurders staan toe dat je je inschrijft bij de gemeente. Dit is nodig om een Nederlandse bankrekening te openen, een BSN te krijgen en je aan te melden voor zorgverzekering.',
                },
            ],
        },

        why: {
            title: 'Waarom huurders kiezen voor ApartmentHub bij appartementen te huur in Amsterdam',
            body: 'ApartmentHub is gebouwd voor huurders. Elk appartement wordt door ons team gecontroleerd voordat het live gaat, je dossier wordt veilig opgeslagen en hergebruikt voor elke aanvraag, en onze lokale verhuurspecialisten zijn beschikbaar op WhatsApp om vragen te beantwoorden in het Engels of Nederlands. We regelen bezichtigingen, onderhandelingen en digitale contractondertekening van begin tot eind — zodat jij je kunt richten op je nieuwe Amsterdamse thuis.',
        },
    },
};

const ApartmentsSEOContent = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = content[currentLang] || content.en;

    return (
        <section className={styles.section} aria-labelledby="apartments-seo-title">
            <div className={styles.container}>
                <span className={styles.eyebrow}>{t.eyebrow}</span>
                <h2 id="apartments-seo-title" className={styles.title}>{t.title}</h2>
                <p className={styles.lead}>{t.lead}</p>

                <div className={styles.block}>
                    <h3 className={styles.h3}>{t.types.title}</h3>
                    <p className={styles.body}>{t.types.intro}</p>
                    <div className={styles.grid}>
                        {t.types.items.map((item) => (
                            <article key={item.name} className={styles.card}>
                                <h4 className={styles.cardTitle}>{item.name}</h4>
                                <p className={styles.cardText}>{item.text}</p>
                            </article>
                        ))}
                    </div>
                </div>

                <div className={styles.block}>
                    <h3 className={styles.h3}>{t.prices.title}</h3>
                    <p className={styles.body}>{t.prices.body}</p>
                    <ul className={styles.bulletList}>
                        {t.prices.bullets.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                    <p className={styles.body}>{t.prices.footer}</p>
                </div>

                <div className={styles.block}>
                    <h3 className={styles.h3}>{t.documents.title}</h3>
                    <p className={styles.body}>{t.documents.intro}</p>
                    <ul className={styles.bulletList}>
                        {t.documents.items.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                    <p className={styles.body}>{t.documents.footer}</p>
                </div>

                <div className={styles.block}>
                    <h3 className={styles.h3}>{t.tips.title}</h3>
                    <div className={styles.grid}>
                        {t.tips.items.map((item) => (
                            <article key={item.name} className={styles.card}>
                                <h4 className={styles.cardTitle}>{item.name}</h4>
                                <p className={styles.cardText}>{item.text}</p>
                            </article>
                        ))}
                    </div>
                </div>

                <div className={styles.block}>
                    <h3 className={styles.h3}>{t.why.title}</h3>
                    <p className={styles.body}>{t.why.body}</p>
                </div>
            </div>
        </section>
    );
};

export default ApartmentsSEOContent;
