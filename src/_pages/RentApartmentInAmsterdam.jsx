import React from 'react';
import Link from 'next/link';
import styles from './ApartmentsForRentInAmsterdam.module.css';

const content = {
    en: {
        eyebrow: 'Tenant Rental Guide',
        h1: 'Rent an Apartment in Amsterdam',
        lead: 'Ready to rent an apartment in Amsterdam? This step-by-step guide walks tenants and expats through everything you need to rent in Amsterdam — from required documents and deposits to contract types, registration, and how to secure a verified rental fast.',
        sections: {
            who: {
                title: 'Who can rent an apartment in Amsterdam?',
                body: 'Almost anyone with a stable income can rent an apartment in Amsterdam — Dutch nationals, EU citizens, and non-EU expats with a valid residence permit. Most landlords ask for proof that your gross monthly income is at least 3× the rent, a recent employment contract or three months of payslips, a copy of your ID or passport, and a deposit equal to one or two months’ rent. Self-employed tenants and students can usually qualify with a guarantor or a higher deposit.',
            },
            cost: {
                title: 'What does it cost to rent in Amsterdam?',
                body: 'Renting an apartment in Amsterdam involves more than just the monthly rent. Plan for these recurring and one-off costs so there are no surprises after you sign:',
                bullets: [
                    'Monthly rent — typically €1,500 – €3,800 depending on size and neighborhood',
                    'Service costs — €50 – €250 per month for shared maintenance, often listed separately',
                    'Utilities — €120 – €250 per month for gas, water, electricity, and internet (kale huur listings)',
                    'Deposit — usually 1 to 2 months’ rent, refundable at the end of the lease',
                    'Municipal taxes — small annual fees for waste collection and water board contributions',
                ],
            },
            documents: {
                title: 'Documents you need to rent in Amsterdam',
                intro: 'Landlords in Amsterdam move fast. Having a complete dossier ready means you can apply within minutes of seeing a new listing. ApartmentHub stores everything securely so you never miss a viewing window.',
                items: [
                    {
                        name: 'Valid ID or passport',
                        text: 'A government-issued photo ID for every adult tenant on the lease. Expats can use their passport plus a residence permit if applicable.',
                    },
                    {
                        name: 'Proof of income',
                        text: 'A signed employment contract, the three most recent payslips, or — for freelancers — your last annual income statement and bank statements.',
                    },
                    {
                        name: 'Employer’s reference letter',
                        text: 'A short letter from HR confirming your role, contract type, and salary. Optional but speeds up acceptance.',
                    },
                    {
                        name: 'Bank statement',
                        text: 'A recent statement showing your name, IBAN, and salary deposits. Helps landlords verify your stated income.',
                    },
                    {
                        name: 'Guarantor declaration',
                        text: 'Required if your income is below the 3× rent threshold. A parent, employer, or relocation agency can act as guarantor.',
                    },
                    {
                        name: 'Reference from previous landlord',
                        text: 'Optional but recommended — a positive reference can be the deciding factor on competitive listings.',
                    },
                ],
            },
            steps: {
                title: 'How to rent an apartment in Amsterdam — step by step',
                items: [
                    {
                        title: '1. Set your budget and area',
                        text: 'Decide on your maximum monthly rent and shortlist two or three Amsterdam neighborhoods. Renting close to a metro or tram stop typically saves more time than living centrally.',
                    },
                    {
                        title: '2. Prepare your tenant dossier',
                        text: 'Upload your ID, payslips, employer letter, and bank statement once. ApartmentHub reuses your dossier for every application so you can apply within minutes.',
                    },
                    {
                        title: '3. Apply to verified listings',
                        text: 'Browse our verified rentals and apply directly. No agent fees for tenants, no duplicate listings, and clear rules on who pays for utilities.',
                    },
                    {
                        title: '4. Attend a viewing',
                        text: 'Most landlords schedule viewings within a few days. ApartmentHub coordinates them via WhatsApp, which is ideal if you’re relocating from abroad.',
                    },
                    {
                        title: '5. Sign your lease and pay the deposit',
                        text: 'Once accepted, sign your lease digitally and transfer the deposit. Read the contract carefully — pay attention to the notice period, indexation clause, and what is included in the rent.',
                    },
                    {
                        title: '6. Register at the municipality',
                        text: 'Register your new address with the Gemeente Amsterdam within five days of moving in. This is required to receive your BSN, open a Dutch bank account, and start work.',
                    },
                ],
            },
            contracts: {
                title: 'Rental contracts in Amsterdam: what to know',
                body: 'Most apartments in Amsterdam are rented under one of two contract types. Knowing which type you sign protects you against surprises later:',
                bullets: [
                    'Indefinite contract (huurovereenkomst voor onbepaalde tijd) — open-ended, with strong tenant protections and a one-month notice period for the tenant',
                    'Fixed-term contract — used for furnished or short-stay apartments, ending on a specified date',
                    'Diplomatic clause — common when the landlord may return to live in the apartment; allows early termination with notice',
                    'Indexation — most contracts allow yearly rent increases tied to the Dutch CPI; the percentage is capped by law',
                ],
            },
            faq: {
                title: 'Renting an apartment in Amsterdam — FAQ',
                items: [
                    {
                        q: 'How long does it take to rent an apartment in Amsterdam?',
                        a: 'With a complete dossier ready, most tenants on ApartmentHub move from first application to signed lease within 1 to 3 weeks. Without a dossier ready, the average is 6 to 8 weeks.',
                    },
                    {
                        q: 'Can I rent an apartment in Amsterdam from abroad?',
                        a: 'Yes. Many tenants secure a rental before they arrive. We coordinate viewings via video call and digital signatures, and we accept foreign IDs and contracts in English.',
                    },
                    {
                        q: 'How much deposit do landlords ask for?',
                        a: 'Most Amsterdam landlords ask for one or two months’ rent as a deposit. The deposit is refundable at the end of the lease, minus any documented damages.',
                    },
                    {
                        q: 'Are agent fees legal when renting in Amsterdam?',
                        a: 'No. Since 2015, Dutch law forbids agents from charging tenants when they also represent the landlord. Every apartment on ApartmentHub is fee-free for tenants.',
                    },
                    {
                        q: 'Can I rent an apartment in Amsterdam without a Dutch employment contract?',
                        a: 'Yes. Freelancers, students, and remote workers regularly qualify with a guarantor, an extra deposit, or proof of savings equivalent to 12 months of rent.',
                    },
                    {
                        q: 'When do I need to register with the municipality after renting?',
                        a: 'Within five days of moving in. Bring your signed lease and ID to the Gemeente Amsterdam appointment to receive your BSN and complete your registration.',
                    },
                ],
            },
            cta: {
                title: 'Ready to rent your apartment in Amsterdam?',
                body: 'Browse our verified Amsterdam rentals or talk to our team for personal recommendations matched to your budget, neighborhood, and timeline.',
                primary: 'Browse apartments',
                secondary: 'Talk to a rental advisor',
            },
        },
    },
    nl: {
        eyebrow: 'Huurgids voor huurders',
        h1: 'Een appartement huren in Amsterdam',
        lead: 'Klaar om een appartement te huren in Amsterdam? In deze stapsgewijze gids ontdek je wat je nodig hebt om in Amsterdam te huren — van benodigde documenten en borgsommen tot contractvormen, inschrijving bij de gemeente en hoe je snel een geverifieerde huurwoning vindt.',
        sections: {
            who: {
                title: 'Wie kan een appartement huren in Amsterdam?',
                body: 'Bijna iedereen met een stabiel inkomen kan een appartement huren in Amsterdam — Nederlanders, EU-burgers en expats met een geldige verblijfsvergunning. De meeste verhuurders vragen een bruto maandinkomen van minimaal 3× de huur, een recent arbeidscontract of drie salarisstroken, een kopie van je ID of paspoort en een borg van één of twee maanden huur. Zelfstandigen en studenten kunnen meestal in aanmerking komen met een garantsteller of een hogere borg.',
            },
            cost: {
                title: 'Wat kost het om in Amsterdam te huren?',
                body: 'Een appartement huren in Amsterdam betekent meer dan alleen de kale huur. Houd rekening met deze terugkerende en eenmalige kosten zodat je niet voor verrassingen komt te staan:',
                bullets: [
                    'Maandelijkse huur — meestal €1.500 – €3.800 afhankelijk van grootte en wijk',
                    'Servicekosten — €50 – €250 per maand voor gedeeld onderhoud, vaak los vermeld',
                    'Nutsvoorzieningen — €120 – €250 per maand voor gas, water, elektra en internet (bij kale huur)',
                    'Borg — meestal 1 tot 2 maanden huur, terugbetaalbaar na afloop van het contract',
                    'Gemeentelijke heffingen — kleine jaarlijkse kosten voor afval en waterschapsbelasting',
                ],
            },
            documents: {
                title: 'Welke documenten heb je nodig om in Amsterdam te huren?',
                intro: 'Verhuurders in Amsterdam reageren snel. Met een compleet dossier kun je binnen enkele minuten reageren op een nieuwe woning. ApartmentHub bewaart alles veilig zodat je nooit een bezichtiging mist.',
                items: [
                    {
                        name: 'Geldig ID of paspoort',
                        text: 'Een door de overheid afgegeven legitimatie voor elke volwassen huurder op het contract. Expats kunnen hun paspoort en eventueel hun verblijfsvergunning gebruiken.',
                    },
                    {
                        name: 'Inkomensbewijs',
                        text: 'Een ondertekend arbeidscontract, de drie meest recente salarisstroken of — voor zzp’ers — je laatste jaaropgave en bankafschriften.',
                    },
                    {
                        name: 'Werkgeversverklaring',
                        text: 'Een korte verklaring van HR met functie, contractvorm en salaris. Niet verplicht maar versnelt acceptatie aanzienlijk.',
                    },
                    {
                        name: 'Bankafschrift',
                        text: 'Een recent afschrift met je naam, IBAN en salarisstortingen. Hiermee kunnen verhuurders je opgegeven inkomen verifiëren.',
                    },
                    {
                        name: 'Garantstellingsverklaring',
                        text: 'Nodig als je inkomen onder de norm van 3× de huur ligt. Een ouder, werkgever of relocation agency kan optreden als garantsteller.',
                    },
                    {
                        name: 'Referentie van vorige verhuurder',
                        text: 'Niet verplicht maar aanbevolen — een positieve referentie kan de doorslag geven bij populaire woningen.',
                    },
                ],
            },
            steps: {
                title: 'Een appartement huren in Amsterdam — stap voor stap',
                items: [
                    {
                        title: '1. Bepaal je budget en zoekgebied',
                        text: 'Stel een maximale maandhuur vast en kies twee of drie Amsterdamse wijken. Dichtbij een metro- of tramhalte wonen levert vaak meer tijdswinst op dan centraal wonen.',
                    },
                    {
                        title: '2. Maak je huurdersdossier compleet',
                        text: 'Upload eenmalig je ID, salarisstroken, werkgeversverklaring en bankafschrift. ApartmentHub gebruikt je dossier opnieuw voor elke aanvraag, zodat je razendsnel kunt reageren.',
                    },
                    {
                        title: '3. Reageer op geverifieerde woningen',
                        text: 'Bekijk ons geverifieerde aanbod en reageer direct. Geen courtage voor huurders, geen dubbele advertenties en duidelijke afspraken over wie de nutsvoorzieningen betaalt.',
                    },
                    {
                        title: '4. Bezichtig de woning',
                        text: 'De meeste verhuurders plannen bezichtigingen binnen enkele dagen. ApartmentHub regelt dit via WhatsApp — ideaal als je vanuit het buitenland verhuist.',
                    },
                    {
                        title: '5. Onderteken het contract en betaal de borg',
                        text: 'Na acceptatie teken je het contract digitaal en maak je de borg over. Lees het contract goed — let op de opzegtermijn, indexatieclausule en wat er onder de huur valt.',
                    },
                    {
                        title: '6. Schrijf je in bij de gemeente',
                        text: 'Schrijf je nieuwe adres binnen vijf dagen na de verhuizing in bij de Gemeente Amsterdam. Dit is verplicht om je BSN te ontvangen, een Nederlandse bankrekening te openen en aan het werk te gaan.',
                    },
                ],
            },
            contracts: {
                title: 'Huurcontracten in Amsterdam: wat je moet weten',
                body: 'De meeste appartementen in Amsterdam worden verhuurd onder een van twee contractvormen. Weten welke vorm je tekent voorkomt verrassingen achteraf:',
                bullets: [
                    'Onbepaalde tijd (huurovereenkomst voor onbepaalde tijd) — open contract met sterke huurbescherming en een opzegtermijn van één maand voor huurders',
                    'Bepaalde tijd — gebruikt voor gemeubileerde of short-stay woningen, eindigt automatisch op de afgesproken datum',
                    'Diplomatenclausule — gangbaar als de verhuurder mogelijk terugkeert; maakt vroegtijdige opzegging met opzegtermijn mogelijk',
                    'Indexering — de meeste contracten staan jaarlijkse huurverhoging toe gekoppeld aan de Nederlandse CPI; het percentage is wettelijk gemaximeerd',
                ],
            },
            faq: {
                title: 'Een appartement huren in Amsterdam — Veelgestelde vragen',
                items: [
                    {
                        q: 'Hoelang duurt het om een appartement te huren in Amsterdam?',
                        a: 'Met een compleet dossier teken je via ApartmentHub gemiddeld binnen 1 tot 3 weken een huurcontract. Zonder dossier duurt het gemiddeld 6 tot 8 weken.',
                    },
                    {
                        q: 'Kan ik vanuit het buitenland een appartement huren in Amsterdam?',
                        a: 'Ja. Veel huurders regelen hun woning al voor aankomst. We organiseren bezichtigingen via videobellen, accepteren digitale handtekeningen en buitenlandse ID’s en contracten in het Engels.',
                    },
                    {
                        q: 'Hoeveel borg vragen verhuurders?',
                        a: 'De meeste Amsterdamse verhuurders vragen één of twee maanden huur als borg. De borg krijg je aan het einde van de huurperiode terug, minus eventuele schade.',
                    },
                    {
                        q: 'Mogen makelaars courtage vragen aan huurders?',
                        a: 'Nee. Sinds 2015 verbiedt de Nederlandse wet dubbele courtage. Elk appartement op ApartmentHub is courtagevrij voor huurders.',
                    },
                    {
                        q: 'Kan ik in Amsterdam huren zonder Nederlands arbeidscontract?',
                        a: 'Ja. Zzp’ers, studenten en thuiswerkers komen regelmatig in aanmerking met een garantsteller, een extra borg of bewijs van spaargeld ter hoogte van 12 maanden huur.',
                    },
                    {
                        q: 'Wanneer moet ik me inschrijven bij de gemeente?',
                        a: 'Binnen vijf dagen na de verhuizing. Neem je getekende huurcontract en ID mee naar de afspraak bij de Gemeente Amsterdam om je BSN te ontvangen en je inschrijving af te ronden.',
                    },
                ],
            },
            cta: {
                title: 'Klaar om je appartement in Amsterdam te huren?',
                body: 'Bekijk ons geverifieerde Amsterdamse aanbod of neem contact op met ons team voor persoonlijk advies op basis van je budget, wijk en planning.',
                primary: 'Bekijk appartementen',
                secondary: 'Spreek met een huuradviseur',
            },
        },
    },
};

const RentApartmentInAmsterdam = ({ lang = 'en' }) => {
    const t = content[lang] || content.en;
    const apartmentsHref = lang === 'nl' ? '/nl/appartementen' : '/en/apartments';
    const contactHref = lang === 'nl' ? '/nl/contact' : '/en/contact';
    const browseGuideHref =
        lang === 'nl'
            ? '/nl/appartementen-te-huur-in-amsterdam'
            : '/en/apartments-for-rent-in-amsterdam';

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

    return (
        <main className={styles.page}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
                        <Link href={contactHref} className={styles.ctaSecondary}>
                            {t.sections.cta.secondary}
                        </Link>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.who.title}</h2>
                    <p className={styles.body}>{t.sections.who.body}</p>
                </div>
            </section>

            <section className={`${styles.section} ${styles.sectionMuted}`}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.cost.title}</h2>
                    <p className={styles.body}>{t.sections.cost.body}</p>
                    <ul className={styles.bulletList}>
                        {t.sections.cost.bullets.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.documents.title}</h2>
                    <p className={styles.body}>{t.sections.documents.intro}</p>
                    <div className={styles.grid}>
                        {t.sections.documents.items.map((item) => (
                            <article key={item.name} className={styles.card}>
                                <h3 className={styles.cardTitle}>{item.name}</h3>
                                <p className={styles.cardText}>{item.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`${styles.section} ${styles.sectionMuted}`}>
                <div className={styles.container}>
                    <h2 className={styles.h2}>{t.sections.steps.title}</h2>
                    <ol className={styles.steps}>
                        {t.sections.steps.items.map((step) => (
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
                    <h2 className={styles.h2}>{t.sections.contracts.title}</h2>
                    <p className={styles.body}>{t.sections.contracts.body}</p>
                    <ul className={styles.bulletList}>
                        {t.sections.contracts.bullets.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                    <p className={styles.linkLine}>
                        <Link href={browseGuideHref} className={styles.inlineLink}>
                            {lang === 'nl'
                                ? 'Bekijk de gids over appartementen te huur in Amsterdam →'
                                : 'See the apartments-for-rent guide for Amsterdam →'}
                        </Link>
                    </p>
                </div>
            </section>

            <section className={`${styles.section} ${styles.sectionMuted}`}>
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

export default RentApartmentInAmsterdam;
