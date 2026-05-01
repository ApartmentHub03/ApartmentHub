import React from 'react';
import Link from 'next/link';
import styles from './ApartmentsForRentInAmsterdam.module.css';

const content = {
    en: {
        eyebrow: 'Amsterdam Rental Guide',
        h1: 'Apartments for Rent in Amsterdam',
        lead: 'Looking for apartments for rent in Amsterdam? ApartmentHub helps international tenants and locals find verified rental apartments across every neighborhood of the city — from canal-side studios in Centrum to family homes in Oud-Zuid and modern builds in Amsterdam-Noord.',
        sections: {
            why: {
                title: 'Why rent an apartment in Amsterdam?',
                body: 'Amsterdam is the most in-demand rental market in the Netherlands. With more than 60,000 expats arriving each year, the city combines world-class employers, a thriving startup scene, and a quality of life that consistently ranks among the highest in Europe. Renting an apartment in Amsterdam gives you the flexibility to live close to work, immerse yourself in Dutch culture, and explore the city by bike — all without the long-term commitment of buying.',
            },
            market: {
                title: 'The Amsterdam rental market in 2026',
                body: 'Demand for apartments for rent in Amsterdam continues to outpace supply. Average rents range from roughly €1,800 for a studio to €3,500+ for a two-bedroom apartment, depending on the neighborhood. Most listings move within days, so a strong, well-prepared dossier is critical. ApartmentHub publishes new verified listings every week and supports tenants through every step of the application.',
                bullets: [
                    'Studios from €1,500 – €2,200 per month',
                    'One-bedroom apartments from €2,000 – €2,800',
                    'Two-bedroom apartments from €2,800 – €3,800',
                    'Three-bedroom apartments and family homes from €3,500 – €5,500',
                ],
            },
            neighborhoods: {
                title: 'Popular Amsterdam neighborhoods to rent in',
                intro: 'Each Amsterdam neighborhood has its own character. Use this overview to narrow down where to start your search:',
                items: [
                    {
                        name: 'Centrum',
                        text: 'The historic city center with UNESCO-listed canals, perfect for those who want to live in walking distance of museums, restaurants, and nightlife.',
                    },
                    {
                        name: 'Jordaan & De Pijp',
                        text: 'Charming, vibrant neighborhoods loved by young professionals — narrow streets, independent cafés, and weekly markets.',
                    },
                    {
                        name: 'Oud-Zuid & Zuidas',
                        text: 'Upscale, leafy areas close to Vondelpark, the Concertgebouw, and Amsterdam’s main business district.',
                    },
                    {
                        name: 'Oost & IJburg',
                        text: 'Modern apartments, great public transport, and quick access to the IJ lake — popular with families and remote workers.',
                    },
                    {
                        name: 'Noord',
                        text: 'Amsterdam’s fastest-growing district. Newly built apartments, creative hubs, and a short ferry ride to Centraal Station.',
                    },
                    {
                        name: 'West & Westerpark',
                        text: 'Diverse and lively, with rents that are typically more attainable than the canal belt while staying close to the center.',
                    },
                ],
            },
            how: {
                title: 'How to rent an apartment in Amsterdam with ApartmentHub',
                steps: [
                    {
                        title: '1. Browse verified listings',
                        text: 'Every apartment on ApartmentHub is verified — no scams, no duplicates, and no agent fees passed on to tenants.',
                    },
                    {
                        title: '2. Build your tenant dossier once',
                        text: 'Upload your ID, proof of income and employer letter once. We securely reuse it for every application so you never miss a viewing window.',
                    },
                    {
                        title: '3. Book viewings via WhatsApp',
                        text: 'Plan viewings directly in WhatsApp — convenient, fast, and ideal for tenants relocating from abroad.',
                    },
                    {
                        title: '4. Sign your lease online',
                        text: 'Once your application is accepted, sign the lease digitally and move in stress-free.',
                    },
                ],
            },
            faq: {
                title: 'Apartments for rent in Amsterdam — FAQ',
                items: [
                    {
                        q: 'How much does it cost to rent an apartment in Amsterdam?',
                        a: 'Studios in Amsterdam typically start around €1,500 per month, while a one-bedroom apartment averages €2,000 – €2,800. Two-bedroom apartments in central neighborhoods often exceed €3,000 per month.',
                    },
                    {
                        q: 'Can expats rent an apartment in Amsterdam?',
                        a: 'Yes. International tenants regularly rent through ApartmentHub. Most landlords accept a recent employment contract, three months of payslips, or a guarantor as proof of income.',
                    },
                    {
                        q: 'How quickly do apartments for rent in Amsterdam get taken?',
                        a: 'In-demand listings often receive multiple applications within 24–48 hours. Having a complete tenant dossier ready dramatically increases your chances.',
                    },
                    {
                        q: 'Do I need a Dutch BSN number to rent in Amsterdam?',
                        a: 'A BSN is not required to sign a rental contract, but most landlords ask for one within the first month so you can register at your new address with the municipality.',
                    },
                    {
                        q: 'Are utilities included in Amsterdam rental prices?',
                        a: 'It depends on the listing. Apartments are advertised as either kale huur (rent only) or inclusive of gas, water, electricity, and internet. ApartmentHub clearly labels both on every listing.',
                    },
                ],
            },
            cta: {
                title: 'Start your search for an apartment in Amsterdam',
                body: 'Browse our handpicked apartments for rent in Amsterdam, or talk to our team for personal recommendations based on your budget and timeline.',
                primary: 'Browse apartments',
                secondary: 'Get personal rental support',
            },
        },
    },
    nl: {
        eyebrow: 'Amsterdamse Huurgids',
        h1: 'Appartementen te huur in Amsterdam',
        lead: 'Op zoek naar appartementen te huur in Amsterdam? ApartmentHub helpt huurders en expats verifieerde huurwoningen vinden in elke wijk van de stad — van grachtenpand-studio’s in het Centrum tot gezinswoningen in Oud-Zuid en nieuwbouw in Amsterdam-Noord.',
        sections: {
            why: {
                title: 'Waarom een appartement huren in Amsterdam?',
                body: 'Amsterdam is de meest gewilde huurmarkt van Nederland. Met meer dan 60.000 expats die zich elk jaar vestigen, combineert de stad internationale werkgevers, een bloeiende startup-scene en een woonkwaliteit die behoort tot de hoogste van Europa. Een appartement huren in Amsterdam geeft je flexibiliteit om dichtbij je werk te wonen, de Nederlandse cultuur te beleven en de stad op de fiets te ontdekken — zonder de langetermijnverplichting van een koopwoning.',
            },
            market: {
                title: 'De Amsterdamse huurmarkt in 2026',
                body: 'De vraag naar appartementen te huur in Amsterdam blijft groter dan het aanbod. Gemiddelde huurprijzen lopen uiteen van ongeveer €1.800 voor een studio tot €3.500+ voor een tweekamerappartement, afhankelijk van de wijk. De meeste woningen worden binnen enkele dagen verhuurd, dus een sterk, compleet huurdersdossier is cruciaal. ApartmentHub publiceert wekelijks nieuwe geverifieerde woningen en begeleidt huurders bij elke stap van de aanvraag.',
                bullets: [
                    'Studio’s vanaf €1.500 – €2.200 per maand',
                    'Eenkamerappartementen vanaf €2.000 – €2.800',
                    'Tweekamerappartementen vanaf €2.800 – €3.800',
                    'Driekamerappartementen en gezinswoningen vanaf €3.500 – €5.500',
                ],
            },
            neighborhoods: {
                title: 'Populaire Amsterdamse wijken om te huren',
                intro: 'Elke Amsterdamse wijk heeft een eigen karakter. Gebruik dit overzicht om je zoektocht te starten:',
                items: [
                    {
                        name: 'Centrum',
                        text: 'Het historische hart van de stad met UNESCO-grachten, ideaal voor wie op loopafstand van musea, restaurants en uitgaansgelegenheden wil wonen.',
                    },
                    {
                        name: 'Jordaan & De Pijp',
                        text: 'Sfeervolle, levendige buurten geliefd bij young professionals — smalle straten, eigenzinnige cafés en wekelijkse markten.',
                    },
                    {
                        name: 'Oud-Zuid & Zuidas',
                        text: 'Chique, groene wijken vlak bij het Vondelpark, het Concertgebouw en Amsterdams belangrijkste zakendistrict.',
                    },
                    {
                        name: 'Oost & IJburg',
                        text: 'Moderne appartementen, uitstekend openbaar vervoer en snelle toegang tot het IJ — populair bij gezinnen en thuiswerkers.',
                    },
                    {
                        name: 'Noord',
                        text: 'Amsterdams snelst groeiende stadsdeel. Nieuwbouwappartementen, creatieve hubs en een korte pont naar Centraal Station.',
                    },
                    {
                        name: 'West & Westerpark',
                        text: 'Divers en bruisend, met huurprijzen die vaak betaalbaarder zijn dan de grachtengordel terwijl je dichtbij het centrum blijft.',
                    },
                ],
            },
            how: {
                title: 'Zo huur je een appartement in Amsterdam via ApartmentHub',
                steps: [
                    {
                        title: '1. Bekijk geverifieerde woningen',
                        text: 'Elk appartement op ApartmentHub is geverifieerd — geen oplichting, geen dubbele advertenties en geen courtage voor huurders.',
                    },
                    {
                        title: '2. Bouw één keer je huurdersdossier',
                        text: 'Upload eenmalig je ID, salarisstroken en werkgeversverklaring. We hergebruiken alles veilig voor elke aanvraag, zodat je nooit een bezichtiging mist.',
                    },
                    {
                        title: '3. Boek bezichtigingen via WhatsApp',
                        text: 'Plan bezichtigingen direct in WhatsApp — handig, snel en perfect voor huurders die vanuit het buitenland verhuizen.',
                    },
                    {
                        title: '4. Teken je huurcontract online',
                        text: 'Zodra je aanvraag is geaccepteerd, teken je het contract digitaal en kun je zonder stress verhuizen.',
                    },
                ],
            },
            faq: {
                title: 'Appartementen te huur in Amsterdam — Veelgestelde vragen',
                items: [
                    {
                        q: 'Wat kost het huren van een appartement in Amsterdam?',
                        a: 'Studio’s in Amsterdam beginnen vaak rond €1.500 per maand, terwijl een eenkamerappartement gemiddeld €2.000 – €2.800 kost. Tweekamerappartementen in centrale wijken liggen vaak boven de €3.000 per maand.',
                    },
                    {
                        q: 'Kunnen expats een appartement huren in Amsterdam?',
                        a: 'Ja. Internationale huurders huren regelmatig via ApartmentHub. De meeste verhuurders accepteren een recent arbeidscontract, drie maanden salarisstroken of een garantsteller als inkomensbewijs.',
                    },
                    {
                        q: 'Hoe snel worden appartementen in Amsterdam verhuurd?',
                        a: 'Populaire woningen krijgen vaak meerdere aanvragen binnen 24–48 uur. Een compleet huurdersdossier vergroot je kansen aanzienlijk.',
                    },
                    {
                        q: 'Heb ik een BSN nodig om in Amsterdam te huren?',
                        a: 'Een BSN is niet verplicht om een huurcontract te tekenen, maar de meeste verhuurders vragen er binnen de eerste maand om, zodat je je kunt inschrijven bij de gemeente.',
                    },
                    {
                        q: 'Zijn nutsvoorzieningen inbegrepen bij Amsterdamse huurprijzen?',
                        a: 'Dat hangt af van de woning. Appartementen worden geadverteerd als kale huur of inclusief gas, water, elektra en internet. ApartmentHub vermeldt dit duidelijk bij elke woning.',
                    },
                ],
            },
            cta: {
                title: 'Begin je zoektocht naar een appartement in Amsterdam',
                body: 'Bekijk onze handgekozen appartementen te huur in Amsterdam of neem contact op met ons team voor persoonlijk advies op basis van je budget en planning.',
                primary: 'Bekijk appartementen',
                secondary: 'Persoonlijke huurbegeleiding',
            },
        },
    },
};

const apartmentCategories = {
    en: [
        { name: 'Studio apartments in Amsterdam', floorSize: 35, bedrooms: 0, priceLow: 1500, priceHigh: 2200, description: 'Compact studio apartments for rent in Amsterdam — ideal for solo tenants, students, and short-term professionals.' },
        { name: 'One-bedroom apartments in Amsterdam', floorSize: 55, bedrooms: 1, priceLow: 2000, priceHigh: 2800, description: 'One-bedroom apartments for rent in Amsterdam — popular with couples and expats relocating to the city.' },
        { name: 'Two-bedroom apartments in Amsterdam', floorSize: 80, bedrooms: 2, priceLow: 2800, priceHigh: 3800, description: 'Two-bedroom apartments for rent in Amsterdam — suited to small families, roommates, and remote workers.' },
        { name: 'Three-bedroom apartments and family homes in Amsterdam', floorSize: 110, bedrooms: 3, priceLow: 3500, priceHigh: 5500, description: 'Three-bedroom apartments and family homes for rent in Amsterdam — perfect for larger households and long-term tenants.' },
    ],
    nl: [
        { name: "Studio's te huur in Amsterdam", floorSize: 35, bedrooms: 0, priceLow: 1500, priceHigh: 2200, description: "Compacte studio's te huur in Amsterdam — ideaal voor alleenstaanden, studenten en short-stay professionals." },
        { name: 'Eenkamerappartementen te huur in Amsterdam', floorSize: 55, bedrooms: 1, priceLow: 2000, priceHigh: 2800, description: 'Eenkamerappartementen te huur in Amsterdam — geliefd bij stellen en expats die naar de stad verhuizen.' },
        { name: 'Tweekamerappartementen te huur in Amsterdam', floorSize: 80, bedrooms: 2, priceLow: 2800, priceHigh: 3800, description: 'Tweekamerappartementen te huur in Amsterdam — passend bij kleine gezinnen, huisgenoten en thuiswerkers.' },
        { name: 'Driekamerappartementen en gezinswoningen te huur in Amsterdam', floorSize: 110, bedrooms: 3, priceLow: 3500, priceHigh: 5500, description: 'Driekamerappartementen en gezinswoningen te huur in Amsterdam — ideaal voor grotere huishoudens en huurders voor de lange termijn.' },
    ],
};

const ApartmentsForRentInAmsterdam = ({ lang = 'en' }) => {
    const t = content[lang] || content.en;
    const apartmentsHref = lang === 'nl' ? '/nl/appartementen' : '/en/apartments';
    const rentInHref = lang === 'nl' ? '/nl/rent-in' : '/en/rent-in';
    const neighborhoodsHref = lang === 'nl' ? '/nl/neighborhoods' : '/en/neighborhoods';
    const contactHref = lang === 'nl' ? '/nl/contact' : '/en/contact';
    const pageUrl =
        lang === 'nl'
            ? 'https://apartmenthub.nl/nl/appartementen-te-huur-in-amsterdam'
            : 'https://apartmenthub.nl/en/apartments-for-rent-in-amsterdam';

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: t.sections.faq.items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
            },
        })),
    };

    const categories = apartmentCategories[lang] || apartmentCategories.en;
    const apartmentItemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t.h1,
        url: pageUrl,
        numberOfItems: categories.length,
        itemListElement: categories.map((category, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            item: {
                '@type': 'Apartment',
                name: category.name,
                description: category.description,
                numberOfBedrooms: category.bedrooms,
                floorSize: {
                    '@type': 'QuantitativeValue',
                    value: category.floorSize,
                    unitCode: 'MTK',
                },
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: 'Amsterdam',
                    addressRegion: 'Noord-Holland',
                    addressCountry: 'NL',
                },
                offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'EUR',
                    lowPrice: category.priceLow,
                    highPrice: category.priceHigh,
                    availability: 'https://schema.org/InStock',
                    priceSpecification: {
                        '@type': 'UnitPriceSpecification',
                        priceCurrency: 'EUR',
                        price: category.priceLow,
                        unitCode: 'MON',
                        referenceQuantity: {
                            '@type': 'QuantitativeValue',
                            value: 1,
                            unitCode: 'MON',
                        },
                    },
                },
            },
        })),
    };

    return (
        <main className={styles.page}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(apartmentItemListJsonLd) }}
            />

            <section className={styles.hero}>
                <div className={styles.container}>
                    <span className={styles.eyebrow}>{t.eyebrow}</span>
                    <h1 className={styles.h1}>{t.h1}</h1>
                    <p className={styles.lead}>{t.lead}</p>
                    <div className={styles.heroCtas}>
                        <Link href={apartmentsHref} className={styles.ctaPrimary}>
                            {t.sections.cta.primary}
                        </Link>
                        <Link href={rentInHref} className={styles.ctaSecondary}>
                            {t.sections.cta.secondary}
                        </Link>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.why.title}</h2>
                    <p className={styles.body}>{t.sections.why.body}</p>
                </div>
            </section>

            <section className={`${styles.section} ${styles.sectionMuted}`}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.market.title}</h2>
                    <p className={styles.body}>{t.sections.market.body}</p>
                    <ul className={styles.bulletList}>
                        {t.sections.market.bullets.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.neighborhoods.title}</h2>
                    <p className={styles.body}>{t.sections.neighborhoods.intro}</p>
                    <div className={styles.grid}>
                        {t.sections.neighborhoods.items.map((item) => (
                            <article key={item.name} className={styles.card}>
                                <h3 className={styles.cardTitle}>{item.name}</h3>
                                <p className={styles.cardText}>{item.text}</p>
                            </article>
                        ))}
                    </div>
                    <p className={styles.linkLine}>
                        <Link href={neighborhoodsHref} className={styles.inlineLink}>
                            {lang === 'nl'
                                ? 'Bekijk alle Amsterdamse wijken →'
                                : 'Explore all Amsterdam neighborhoods →'}
                        </Link>
                    </p>
                </div>
            </section>

            <section className={`${styles.section} ${styles.sectionMuted}`}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.how.title}</h2>
                    <ol className={styles.steps}>
                        {t.sections.how.steps.map((step) => (
                            <li key={step.title} className={styles.step}>
                                <h3 className={styles.stepTitle}>{step.title}</h3>
                                <p className={styles.stepText}>{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.faq.title}</h2>
                    <div className={styles.faqList}>
                        {t.sections.faq.items.map((item) => (
                            <article key={item.q} className={styles.faqItem}>
                                <h3 className={styles.faqQuestion}>{item.q}</h3>
                                <p className={styles.faqAnswer}>{item.a}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.ctaBlock}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.cta.title}</h2>
                    <p className={styles.body}>{t.sections.cta.body}</p>
                    <div className={styles.heroCtas}>
                        <Link href={apartmentsHref} className={styles.ctaPrimary}>
                            {t.sections.cta.primary}
                        </Link>
                        <Link href={contactHref} className={styles.ctaSecondary}>
                            {t.sections.cta.secondary}
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default ApartmentsForRentInAmsterdam;
