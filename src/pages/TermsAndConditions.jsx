import React from 'react';
import { useSelector } from 'react-redux';
import styles from './LegalPage.module.css';

const TermsAndConditions = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const isNL = currentLang !== 'en';

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>
                    {isNL ? 'Algemene Voorwaarden' : 'Terms and Conditions'}
                </h1>

                {/* Artikel 1 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 1 Toepasselijkheid' : 'Article 1 Applicability'}</h2>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'Deze Bemiddelingsvoorwaarden zijn van toepassing op alle aanbiedingen en op alle bemiddelingsopdrachten, alsmede de daaruit voortvloeiende aanvullende bemiddelingsovereenkomst(en) en afspraken tussen Apartmenthub en de woningzoekende, hierna te nemen \'Opdrachtgever\'.'
                            : 'These Mediation Conditions apply to all offers and to all mediation assignments, as well as the resulting additional mediation agreement(s) and agreements between Apartmenthub and the house seeker, hereinafter referred to as \'Client\'.'}
                    </p>
                </section>

                {/* Artikel 2 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 2 Definities' : 'Article 2 Definitions'}</h2>
                    <p className={styles.paragraph}>
                        <strong>2.1.</strong> {isNL
                            ? 'Apartmenthub: Een woningbemiddelingsbureau ingeschreven bij de Kamer van Koophandel Amsterdam onder nummer: 74255142 te noemen onder webadres: https://apartmenthub.nl, hierna te noemen \'Makelaar\'.'
                            : 'Apartmenthub: A housing mediation agency registered with the Chamber of Commerce Amsterdam under number: 74255142, accessible at web address: https://apartmenthub.nl, hereinafter referred to as \'Broker\'.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.2.</strong> {isNL
                            ? 'Woningzoekende: Iedere natuurlijke of rechtspersoon, die de Makelaar opdracht geeft om te bemiddelen bij het zoeken van woonruimte die niet tot de portefeuille van de Makelaar behoort.'
                            : 'House seeker: Any natural or legal person who commissions the Broker to mediate in finding living space that does not belong to the Broker\'s portfolio.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.3.</strong> {isNL
                            ? 'Onder bemiddeling wordt verstaan: de inspanningsverplichting van Makelaar gericht op het tegen betaling van een bemiddelingsvergoeding (courtage) door Opdrachtgever in contact brengen van Opdrachtgever met potentiële verhuurder(s), opdat Opdrachtgever met een verhuurder van een woonruimte een huurovereenkomst sluit, waaronder is begrepen de begeleiding door Makelaar bij bezichtiging(en) van een of meer woonruimte(n) als bedoeld in artikel 7:425 BW.'
                            : 'Mediation means: the obligation of effort by the Broker aimed at bringing the Client into contact with potential landlord(s) against payment of a mediation fee (commission) by the Client, so that the Client concludes a rental agreement with a landlord of a living space, including guidance by the Broker during viewing(s) of one or more living space(s) as referred to in Article 7:425 of the Dutch Civil Code.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.4.</strong> {isNL
                            ? 'Onder bemiddelingsvergoeding of courtage wordt verstaan de door Opdrachtgever aan Makelaar verschuldigde tegenprestatie voor diens bemiddelingswerkzaamheden.'
                            : 'Mediation fee or commission means the consideration owed by the Client to the Broker for their mediation activities.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.5.</strong> {isNL
                            ? 'Bepalingen die afwijken van deze algemene bemiddelingsvoorwaarden maken alleen deel uit van de tussen partijen gesloten overeenkomst indien en voor zover partijen dat uitdrukkelijk schriftelijk zijn overeengekomen.'
                            : 'Provisions deviating from these general mediation conditions only form part of the agreement concluded between the parties if and insofar as the parties have expressly agreed this in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.6.</strong> {isNL
                            ? 'Onder \'schriftelijk\' wordt in deze algemene bemiddelingsvoorwaarden tevens verstaan: per email, per fax of enige andere wijze van communicatie die met het oog op de stand der techniek en de in het maatschappelijk verkeer geldende opvattingen hiermee gelijk kan worden gesteld.'
                            : 'In these general mediation conditions, \'in writing\' also means: by email, by fax or any other mode of communication that can be equated with this in view of the state of the art and prevailing views in society.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.7.</strong> {isNL
                            ? 'De door Makelaar te vervaardigen c.q. door Opdrachtgever verstrekte schriftelijke adviezen, documenten, (taxatie)rapporten, onderzoeken, e.d. zullen in het navolgende worden aangeduid als \'de bescheiden\'. Onder \'de bescheiden\' worden verstaan schriftelijke stukken en op andere media vastgelegde werken, zoals op computerschijven, op usb-sticks of welke andere gegevensdragers ook. Een en ander, tenzij partijen uitdrukkelijk schriftelijk anders zijn overeengekomen.'
                            : 'The written advice, documents, (valuation) reports, investigations, etc. to be produced by the Broker or provided by the Client will hereinafter be referred to as \'the documents\'. \'The documents\' means written documents and works recorded on other media, such as on computer disks, on USB sticks or any other data carriers. All this, unless the parties have expressly agreed otherwise in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.8.</strong> {isNL
                            ? 'Makelaar behoudt zich het recht voor om bij gewijzigde regelgeving de algemene bemiddelingsvoorwaarden van Makelaar te wijzigen.'
                            : 'The Broker reserves the right to amend the Broker\'s general mediation conditions in the event of changed regulations.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.9.</strong> {isNL
                            ? 'Het om welke reden dan ook niet van toepassing zijn van een (deel van een) bepaling van deze algemene bemiddelingsvoorwaarden laat de toepasselijkheid van de overige bepalingen onverlet.'
                            : 'The inapplicability of (part of) a provision of these general mediation conditions for whatever reason does not affect the applicability of the other provisions.'}
                    </p>
                </section>

                {/* Artikel 3 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 3 Overeenkomsten, opdrachten' : 'Article 3 Agreements, Assignments'}</h2>
                    <p className={styles.paragraph}>
                        <strong>3.1.</strong> {isNL
                            ? 'Mondelinge afspraken binden Makelaar eerst nadat deze schriftelijk door Makelaar zijn bevestigd dan wel zodra Makelaar met instemming van Opdrachtgever een aanvang met de uitvoeringshandelingen heeft gemaakt.'
                            : 'Verbal agreements only bind the Broker after they have been confirmed in writing by the Broker or as soon as the Broker has commenced execution of the activities with the Client\'s consent.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.2.</strong> {isNL
                            ? 'Aanvullingen of wijzigingen op de algemene bemiddelingsvoorwaarden of anderszins wijzigingen of aanvullingen op de overeenkomst worden eerst na schriftelijke bevestiging door Makelaar bindend.'
                            : 'Additions or changes to the general mediation conditions or other changes or additions to the agreement only become binding after written confirmation by the Broker.'}
                    </p>
                </section>

                {/* Artikel 4 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 4 Verplichtingen van Opdrachtgever & verschuldigdheid van courtage' : 'Article 4 Obligations of Client & Commission Fees'}</h2>
                    <p className={styles.paragraph}>
                        <strong>4.1.</strong> {isNL
                            ? 'Opdrachtgever dient ervoor te zorgen dat alle voor de uitvoering van de overeenkomst benodigde gegevens tijdig en in de door Makelaar gewenste vorm ter beschikking worden gesteld.'
                            : 'The Client must ensure that all data required for the execution of the agreement is made available in time and in the form desired by the Broker.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.2.</strong> {isNL
                            ? 'Opdrachtgever verleent volledige medewerking aan een deugdelijke uitvoering van de bemiddelingsovereenkomst en onthoudt zich van handelingen die dit zouden kunnen belemmeren.'
                            : 'The Client shall provide full cooperation for the proper execution of the mediation agreement and refrain from actions that could hinder this.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.3.</strong> {isNL
                            ? 'Indien Opdrachtgever of diens relaties gaan wonen in een woonruimte waarvan de gegevens via de Makelaar zijn verkregen, is Opdrachtgever courtage verschuldigd, ongeacht of de huurovereenkomst door bemiddeling van de Makelaar tot stand is gekomen.'
                            : 'If the Client or their relations move into a living space of which the details were obtained via the Broker, the Client owes commission, regardless of whether the rental agreement was concluded through the Broker\'s mediation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.4.</strong> {isNL
                            ? 'Indien om welke reden dan ook Opdrachtgever niet gaat wonen in de woning waarvoor door bemiddeling van Makelaar een huurovereenkomst tot stand is gekomen, of indien deze huurovereenkomst wordt beëindigd, vernietigd of ontbonden, is Opdrachtgever een bedrag verschuldigd van'
                            : 'If for any reason the Client does not move into the property for which a rental agreement was concluded through the Broker\'s mediation, or if this rental agreement is terminated, annulled or dissolved, the Client owes an amount of'} <strong>{isNL ? '1 maand huur exclusief btw' : '1 month rent exclusive of VAT'}</strong>{isNL ? ', zonder recht op gehele of gedeeltelijke restitutie.' : ', without right to full or partial refund.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.5.</strong> {isNL
                            ? 'Indien Opdrachtgever na akkoord voor het huren van een woonruimte afziet van de huur om redenen die niet aan Makelaar zijn toe te rekenen, is Opdrachtgever de courtage verschuldigd die zou gelden indien de huurovereenkomst wél tot stand zou zijn gekomen. Daarnaast dient Opdrachtgever Makelaar te vrijwaren voor mogelijke schadeclaims van de verhuurder.'
                            : 'If the Client, after agreeing to rent a living space, abandons the rent for reasons not attributable to the Broker, the Client owes the commission that would apply if the rental agreement had been concluded. In addition, the Client must indemnify the Broker against possible damage claims from the landlord.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.6.</strong> {isNL
                            ? 'Indien Opdrachtgever verplichtingen niet nakomt, mag Makelaar de uitvoering van de overeenkomst opschorten. Kosten en gevolgen hiervan komen volledig voor rekening van Opdrachtgever.'
                            : 'If the Client fails to meet obligations, the Broker may suspend the execution of the agreement. Costs and consequences of this are entirely for the account of the Client.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.7.</strong> {isNL
                            ? 'Indien Opdrachtgever de Makelaar verzoekt een huurvoorstel in te dienen bij een derde en vervolgens, om redenen die niet aan Makelaar zijn toe te rekenen, afziet van het object, is Opdrachtgever een bedrag verschuldigd van'
                            : 'If the Client requests the Broker to submit a rental proposal to a third party and subsequently, for reasons not attributable to the Broker, abandons the object, the Client owes an amount of'} <strong>{isNL ? '1 maand huur exclusief btw' : '1 month rent exclusive of VAT'}</strong>.
                    </p>
                </section>

                {/* Artikel 5 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 5 Persoonsgegevens' : 'Article 5 Personal Data'}</h2>
                    <p className={styles.paragraph}>
                        {isNL
                            ? 'De persoonsgegevens van Opdrachtgever worden opgenomen in de administratie van Makelaar. Makelaar verstrekt zonder toestemming van Opdrachtgever geen gegevens aan derden. De geregistreerde gegevens worden uitsluitend door Makelaar gebruikt ten behoeve van de uitvoering van door haar met Opdrachtgever gesloten overeenkomsten.'
                            : 'The Client\'s personal data is included in the Broker\'s administration. The Broker does not provide data to third parties without the Client\'s permission. The registered data is used exclusively by the Broker for the execution of agreements concluded with the Client.'}
                    </p>
                </section>

                {/* Artikel 6 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 6 Voortgang, uitvoering opdracht/overeenkomst' : 'Article 6 Progress, Execution of Assignment/Agreement'}</h2>
                    <p className={styles.paragraph}>
                        <strong>6.1.</strong> {isNL
                            ? 'Makelaar is gehouden de opdracht/overeenkomst op deskundige, zorgvuldige wijze en conform de hiervoor in haar branche geldende maatstaven uit te voeren.'
                            : 'The Broker is bound to execute the assignment/agreement in a professional, careful manner and in accordance with the standards applicable in its branch.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>6.2.</strong> {isNL
                            ? 'Makelaar kan niet eerder verplicht worden met de uitvoering van de werkzaamheden te beginnen, dan nadat alle daarvoor noodzakelijk gegevens in haar bezit zijn.'
                            : 'The Broker cannot be obliged to commence execution of the activities until all necessary data for this is in its possession.'}
                    </p>
                </section>

                {/* Artikel 7 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 7 Duur overeenkomst, inspanningsverplichting makelaar' : 'Article 7 Duration of Agreement, Obligation of Effort'}</h2>
                    <p className={styles.paragraph}>
                        <strong>7.1.</strong> {isNL
                            ? 'Een overeenkomst tot bemiddeling loopt voor onbepaalde tijd, tenzij schriftelijk anders is overeengekomen.'
                            : 'A mediation agreement runs for an indefinite period, unless agreed otherwise in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.2.</strong> {isNL
                            ? 'Makelaar zal zich naar beste kunnen en weten inspannen om het door Opdrachtgever gewenste c.q. beoogde resultaat te bereiken. Dit is te allen tijde een inspanningsverplichting van Makelaar en geen resultaatsverplichting. Indien voornoemd resultaat uitblijft, ontslaat dit Opdrachtgever derhalve niet van zijn verplichtingen jegens Makelaar, met uitzondering van eventuele verplichtingen die door partijen uitdrukkelijk gekoppeld zijn aan het bereiken van het beoogde resultaat.'
                            : 'The Broker will endeavor to the best of its ability and knowledge to achieve the result desired or intended by the Client. This is at all times an obligation of effort by the Broker and not an obligation of result. If the aforementioned result is not achieved, this therefore does not release the Client from its obligations towards the Broker, with the exception of any obligations that the parties have expressly linked to achieving the intended result.'}
                    </p>
                </section>

                {/* Artikel 8 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 8 Einde en opzegging van de bemiddelingsovereenkomst' : 'Article 8 Termination and Cancellation of the Mediation Agreement'}</h2>
                    <p className={styles.paragraph}>
                        <strong>8.1.</strong> {isNL
                            ? 'Tenzij anders overeengekomen en onverminderd het overigens bepaalde in deze algemene bemiddelingsvoorwaarden, eindigt de bemiddelingsovereenkomst onder meer door:'
                            : 'Unless agreed otherwise and without prejudice to the other provisions of these general mediation conditions, the mediation agreement ends inter alia by:'}
                    </p>
                    <ul className={styles.list}>
                        <li>{isNL ? 'a. vervulling van de overeenkomst door Makelaar;' : 'a. fulfillment of the agreement by the Broker;'}</li>
                        <li>{isNL ? 'b. opzegging door Opdrachtgever;' : 'b. cancellation by the Client;'}</li>
                        <li>{isNL ? 'c. opzegging door Makelaar.' : 'c. cancellation by the Broker.'}</li>
                    </ul>
                    <p className={styles.paragraphMt}>
                        <strong>8.2.</strong> {isNL
                            ? 'De overeenkomst is vervuld zodra het beoogde resultaat is bereikt.'
                            : 'The agreement is fulfilled as soon as the intended result is achieved.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.3.</strong> {isNL
                            ? 'Opdrachtgever en Makelaar zijn bevoegd om deze overeenkomst op ieder moment op te zeggen.'
                            : 'Client and Broker are entitled to cancel this agreement at any time.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.4.</strong> {isNL
                            ? 'Partijen kunnen aan de beëindiging van de overeenkomst door opzegging geen recht op schadevergoeding ontlenen, tenzij wordt opgezegd vanwege het tekortschieten in de nakoming van een of meer verplichtingen door de andere partij.'
                            : 'Parties cannot derive any right to compensation from the termination of the agreement by cancellation, unless cancellation is due to failure to comply with one or more obligations by the other party.'}
                    </p>
                </section>

                {/* Artikel 9 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 9 Bemiddelingscourtage' : 'Article 9 Mediation Commission'}</h2>
                    <p className={styles.paragraph}>
                        <strong>9.1.</strong> {isNL
                            ? 'De woningzoekende geeft de Makelaar opdracht tot het zoeken van woonruimte die aansluit bij de opgegeven woonwensen. De Makelaar werkt volgens het'
                            : 'The house seeker commissions the Broker to search for living space that matches the specified housing wishes. The Broker works according to the'} <em>No Cure No Pay</em>-{isNL ? 'principe. Wanneer door bemiddeling van de Makelaar een huurovereenkomst tot stand komt, is Opdrachtgever een bemiddelingscourtage verschuldigd gelijk aan' : 'principle. When a rental agreement is concluded through mediation by the Broker, the Client owes a mediation commission equal to'} <strong>{isNL ? 'één maand huur exclusief btw' : 'one month rent exclusive of VAT'}</strong>.
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>{isNL ? 'Aanvullende regeling:' : 'Additional regulation:'}</strong><br />
                        {isNL
                            ? 'Indien de maandhuur'
                            : 'If the monthly rent is'} <strong>{isNL ? 'lager dan € 2.000' : 'lower than € 2.000'}</strong> {isNL ? 'bedraagt én de huurovereenkomst een looptijd heeft van' : 'and the rental agreement has a duration of'} <strong>{isNL ? 'meer dan 12 maanden' : 'more than 12 months'}</strong>{isNL ? ', bedraagt de courtage' : ', the commission is'} <strong>{isNL ? 'twee maanden huur exclusief btw' : 'two months rent exclusive of VAT'}</strong>.
                    </p>
                    <p className={styles.paragraphMt}>
                        {isNL
                            ? 'De courtage dient volledig te zijn voldaan voordat de sleutels worden overgedragen.'
                            : 'The commission must be fully paid before the keys are handed over.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.2.</strong> {isNL
                            ? 'Indien de betalingstermijn wordt overschreden, volgt een aanmaningsprocedure. Na de tweede aanmaning is wettelijke rente verschuldigd en worden buitengerechtelijke incassokosten in rekening gebracht van 15% van het factuurbedrag (minimaal € 250).'
                            : 'If the payment term is exceeded, a reminder procedure follows. After the second reminder, statutory interest is owed and extrajudicial collection costs of 15% of the invoice amount (minimum € 250) are charged.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.3.</strong> {isNL
                            ? 'Indien blijkt dat de woningzoekende een eerder door Makelaar aangeboden woonruimte alsnog accepteert zonder medeweten van Makelaar, is de volledige courtage verschuldigd.'
                            : 'If it appears that the house seeker accepts a living space previously offered by the Broker without the Broker\'s knowledge, the full commission is owed.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.4.</strong> {isNL
                            ? 'Indien de huurovereenkomst op andere wijze tot stand komt terwijl de Makelaar een bemiddelingsopdracht had, is Opdrachtgever een boete verschuldigd van'
                            : 'If the rental agreement is concluded in another way while the Broker had a mediation assignment, the Client owes a penalty of'} <strong>{isNL ? 'één maand huur exclusief btw' : 'one month rent exclusive of VAT'}</strong>.
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.5.</strong> {isNL ? 'Een woonruimte wordt pas aan de woningzoekende beschikbaar gesteld nadat:' : 'A living space is only made available to the house seeker after:'}
                    </p>
                    <ul className={styles.list}>
                        <li>{isNL ? 'de huurovereenkomst door alle partijen is ondertekend;' : 'the rental agreement has been signed by all parties;'}</li>
                        <li>{isNL ? 'huur en borg zijn voldaan;' : 'rent and deposit have been paid;'}</li>
                        <li>{isNL ? 'de courtage' : 'the commission'} <strong>{isNL ? 'exclusief btw' : 'exclusive of VAT'}</strong> {isNL ? 'volledig is betaald.' : 'has been fully paid.'}</li>
                    </ul>
                    <p className={styles.paragraphMt}>
                        <strong>9.6.</strong> {isNL
                            ? 'Aan de beëindiging van de overeenkomst door opzegging kunnen geen rechten op schadevergoeding worden ontleend, tenzij de opzegging het gevolg is van tekortschieten van de andere partij.'
                            : 'No rights to compensation can be derived from the termination of the agreement by cancellation, unless the cancellation is the result of failure by the other party.'}
                    </p>
                </section>

                {/* Artikel 10 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 10 Aansprakelijkheid' : 'Article 10 Liability'}</h2>
                    <p className={styles.paragraph}>
                        <strong>10.1.</strong> {isNL
                            ? 'Indien Makelaar bemiddelt bij het tot stand brengen van een huurovereenkomst tussen verhuurder en huurder is Makelaar nimmer partij bij de huurovereenkomst en hij is niet aansprakelijk voor de inhoud en de uitvoering van de huurovereenkomst. Makelaar is in geen geval aansprakelijk voor de schade van Opdrachtgever die het gevolg is van de situatie dat de huurprijs en/of de overeengekomen service(kosten) en/of de bijkomende al dan niet eenmalige vergoedingen niet in overeenstemming zijn met de wet.'
                            : 'If the Broker mediates in the CONCLUSION of a rental agreement between landlord and tenant, the Broker is never a party to the rental agreement and he is not liable for the content and execution of the rental agreement. The Broker is in no case liable for damage of the Client resulting from the situation that the rent and/or the agreed service (costs) and/or the additional whether or not one-off fees are not in accordance with the law.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.2.</strong> {isNL
                            ? 'Makelaar kwijt zich van haar taak zoals van een bedrijf in haar branche mag worden verwacht, maar aanvaardt geen enkele aansprakelijkheid voor schade, met inbegrip van gevolgschade, bedrijfsschade, winstdervingen en/of stagnatieschade, die het gevolg is van handelen of nalaten van Makelaar, haar personeel dan wel door haar ingeschakelde derden.'
                            : 'The Broker acquits itself of its task as may be expected of a company in its branch, but accepts no liability whatsoever for damage, including consequential damage, trading loss, loss of profit and/or stagnation damage, which is the result of acts or omissions of the Broker, its personnel or third parties engaged by it.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.3.</strong> {isNL
                            ? 'Makelaar is niet aansprakelijk voor schade die Opdrachtgever lijdt ten gevolge van handelingen of het nalaten hiervan door de andere partij bij de door bemiddeling van Makelaar tot stand gekomen huurovereenkomst.'
                            : 'The Broker is not liable for damage suffered by the Client as a result of acts or omissions by the other party to the rental agreement concluded through the Broker\'s mediation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.4.</strong> {isNL
                            ? 'De in dit artikel opgenomen beperkingen van de aansprakelijkheid gelden niet indien de schade te wijten is aan opzet en/of bewuste roekeloosheid van Makelaar.'
                            : 'The limitations of liability included in this article do not apply if the damage is due to intent and/or conscious recklessness of the Broker.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.5.</strong> {isNL
                            ? 'Onverminderd het bepaalde in de overige leden van dit artikel is de aansprakelijkheid te allen tijde beperkt tot het bedrag van de door de assuradeur van Makelaar in het voorkomende geval te verstrekken uitkering, voor zover Makelaar hiervoor verzekerd is.'
                            : 'Without prejudice to the provisions of the other paragraphs of this article, liability is at all times limited to the amount of the payment to be provided by the Broker\'s insurer in the event in question, insofar as the Broker is insured for this.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.6.</strong> {isNL
                            ? 'Indien Makelaar niet verzekerd is als bedoeld in het vorige lid is de aansprakelijkheid van Makelaar te allen tijde beperkt tot twee maal de hoogte van de door Makelaar aan Opdrachtgever voor haar werkzaamheden en/of diensten in rekening gebrachte en/of te brengen courtage.'
                            : 'If the Broker is not insured as referred to in the previous paragraph, the Broker\'s liability is at all times limited to twice the amount of the commission charged and/or to be charged by the Broker to the Client for its activities and/or services.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.7.</strong> {isNL
                            ? 'Makelaar is niet aansprakelijk voor de gevolgen van eventuele schade en/of gebreken aan de woning die bij de aanvaarding door Opdrachtgever van de woning aanwezig is. Het is aan Opdrachtgever zelf de woning te controleren op eventuele schade en/of gebreken en zo nodig de verhuurder daarop aan te spreken.'
                            : 'The Broker is not liable for the consequences of any damage and/or defects to the home present upon acceptance of the home by the Client. It is up to the Client to check the home for any damage and/or defects and if necessary to hold the landlord accountable for this.'}
                    </p>
                </section>

                {/* Artikel 11 */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 11 Bevoegde rechter, toepasselijk recht' : 'Article 11 Competent Court, Applicable Law'}</h2>
                    <p className={styles.paragraph}>
                        <strong>11.1.</strong> {isNL
                            ? 'Op de tussen Makelaar en Opdrachtgever gesloten overeenkomst is uitsluitend Nederlands recht van toepassing. De geschillen die uit deze overeenkomst voortvloeien zullen eveneens naar Nederlands recht worden beslecht.'
                            : 'Dutch law applies exclusively to the agreement concluded between Broker and Client. Disputes arising from this agreement will also be settled in accordance with Dutch law.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>11.2.</strong> {isNL
                            ? 'Eventuele geschillen zullen worden beslecht door de bevoegde Nederlandse rechter, zij het dat Makelaar, voor zover de wet zich daar niet dwingendrechtelijk tegen verzet, de bevoegdheid toekomt een zaak aanhangig te maken voor de bevoegde rechter in de plaats waar Makelaar is gevestigd.'
                            : 'Any disputes will be settled by the competent Dutch court, albeit that the Broker, insofar as the law does not forcibly oppose this, is entitled to bring a case before the competent court in the place where the Broker is established.'}
                    </p>
                </section>
            </div>
        </div>
    );
};

export default TermsAndConditions;
