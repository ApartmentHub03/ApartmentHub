'use client';

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
                    {isNL ? 'Algemene Voorwaarden ApartmentHub' : 'ApartmentHub Terms and Conditions'}
                </h1>

                {/* Artikel 1 - Definities */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 1. Definities' : 'Article 1. Definitions'}</h2>
                    <p className={styles.paragraph}>
                        <strong>1.1</strong> {isNL
                            ? 'In deze algemene voorwaarden zijn de volgende definities van toepassing.'
                            : 'In these Terms and Conditions, the following definitions apply.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.2</strong> {isNL
                            ? 'ApartmentHub means ApartmentHub, optreedend als huurbemiddelaar voor de Opdrachtgever, tenzij uitdrukkelijk schriftelijk anders is overeengekomen voor een specifieke Woning.'
                            : 'ApartmentHub means ApartmentHub, acting as a rental agent for the Client, unless expressly agreed otherwise in writing for a specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.3</strong> {isNL
                            ? 'Client means de woningzoekende, kandidaat-huurder of persoon die ApartmentHub opdracht geeft om te helpen bij het vinden, bezichtigen, solliciteren, bieden, onderhandelen of verkrijgen van een huurwoning.'
                            : 'Client means the house seeker, tenant candidate or person who instructs ApartmentHub to assist with finding, viewing, applying for, offering on, negotiating or securing a rental property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.4</strong> {isNL
                            ? 'Listing Side means de verhuurder, eigenaar, aanbiedende makelaar, vastgoedmanager, relocatiebureau of enige andere partij die optreedt aan de zijde van de eigenaar van de woning.'
                            : 'Listing Side means the landlord, owner, listing agent, property manager, relocation agency or any other party acting on the side of the property owner.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.5</strong> {isNL
                            ? 'Property means een huurwoning waarvoor ApartmentHub diensten verleent aan de Opdrachtgever.'
                            : 'Property means a rental property for which ApartmentHub provides services to the Client.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.6</strong> {isNL
                            ? 'Offer Instruction means enige instructie van de Opdrachtgever aan ApartmentHub om door te gaan met een bod, aanvraag, huurvoorstel of Letter of Intent voor een specifieke Woning.'
                            : 'Offer Instruction means any instruction from the Client to ApartmentHub to proceed with an offer, application, rental proposal or Letter of Intent for a specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.7</strong> {isNL
                            ? 'Confirmation means bevestiging dat het bod, de aanvraag of het huurvoorstel van de Opdrachtgever is geaccepteerd of goedgekeurd, of dat de Woning voor de Opdrachtgever is verkregen. Bevestiging kan afkomstig zijn van de verhuurder, eigenaar, aanbiedende makelaar, vastgoedmanager, relocatiebureau, een andere bevoegde partij aan de Listing Side, of van ApartmentHub nadat ApartmentHub een dergelijke bevestiging heeft ontvangen.'
                            : 'Confirmation means confirmation that the Client\u2019s offer, application or rental proposal has been accepted or approved, or that the Property has been secured for the Client. Confirmation may come from the landlord, owner, listing agent, property manager, relocation agency, another authorised party on the Listing Side, or from ApartmentHub after ApartmentHub has received such confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.8</strong> {isNL
                            ? 'Success Fee means de vergoeding die verschuldigd is door de Opdrachtgever wanneer een Woning is verkregen of een huurovereenkomst is gesloten met tussenkomst van ApartmentHub.'
                            : 'Success Fee means the fee payable by the Client when a Property is secured or a rental agreement is concluded through ApartmentHub\u2019s involvement.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>1.9</strong> {isNL
                            ? 'Cancellation Fee means de vergoeding die verschuldigd is door de Opdrachtgever indien de Opdrachtgever annuleert, intrekt, weigert door te gaan zonder geldige juridische of contractuele reden, niet meewerkt, weigert een huurovereenkomst te tekenen zonder geldige juridische of contractuele reden, of een andere woning kiest na Bevestiging.'
                            : 'Cancellation Fee means the fee payable by the Client if the Client cancels, withdraws, refuses to proceed without a valid legal or contractual reason, fails to cooperate, refuses to sign a rental agreement without a valid legal or contractual reason, or chooses another property after Confirmation.'}
                    </p>
                </section>

                {/* Artikel 2 - Toepasselijkheid */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 2. Toepasselijkheid' : 'Article 2. Applicability'}</h2>
                    <p className={styles.paragraph}>
                        <strong>2.1</strong> {isNL
                            ? 'Deze algemene voorwaarden zijn van toepassing op alle diensten die ApartmentHub aan de Opdrachtgever verleent.'
                            : 'These Terms and Conditions apply to all services provided by ApartmentHub to the Client.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.2</strong> {isNL
                            ? 'Deze algemene voorwaarden zijn van toepassing op zoekdiensten, bezichtigingen, videogezichtingen, documentcontroles, huuraanvragen, biedingen, Letters of Intent, huurvoorstellen, onderhandelingen, communicatie met de Listing Side en ondersteuning tijdens het aanvraagproces.'
                            : 'These Terms and Conditions apply to search services, viewings, video viewings, document checks, rental applications, offers, Letters of Intent, rental proposals, negotiations, communication with the Listing Side and support during the application process.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.3</strong> {isNL
                            ? 'Deze algemene voorwaarden zijn van toepassing op alle communicatie en instructies gegeven via WhatsApp, e-mail, online formulier, website, digitale handtekening, platformbericht of enige andere schriftelijke of elektronische communicatie.'
                            : 'These Terms and Conditions apply to all communication and instructions given by WhatsApp, email, online form, website, digital signature, platform message or any other written or electronic communication.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.4</strong> {isNL
                            ? 'Indien een Letter of Intent of een ander woning-specifiek document wordt ondertekend voor een specifieke Woning, is dat document van toepassing naast deze algemene voorwaarden.'
                            : 'If a Letter of Intent or another property specific document is signed for a specific Property, that document applies in addition to these Terms and Conditions.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.5</strong> {isNL
                            ? 'Indien er een verschil bestaat tussen deze algemene voorwaarden en een woning-specifieke Letter of Intent, is de woning-specifieke Letter of Intent van toepassing voor die specifieke Woning, tenzij dit in strijd zou zijn met dwingend Nederlands recht.'
                            : 'If there is a difference between these Terms and Conditions and a property specific Letter of Intent, the property specific Letter of Intent applies for that specific Property, unless this would be contrary to mandatory Dutch law.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>2.6</strong> {isNL
                            ? 'Elke afwijking van deze algemene voorwaarden is alleen geldig indien schriftelijk bevestigd door ApartmentHub.'
                            : 'Any deviation from these Terms and Conditions is only valid if confirmed in writing by ApartmentHub.'}
                    </p>
                </section>

                {/* Artikel 3 - Rol van ApartmentHub */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 3. Rol van ApartmentHub' : 'Article 3. Role of ApartmentHub'}</h2>
                    <p className={styles.paragraph}>
                        <strong>3.1</strong> {isNL
                            ? 'ApartmentHub biedt een huurzoek- en bemiddelingsdienst aan de Opdrachtgever.'
                            : 'ApartmentHub provides a rental search and mediation service for the Client.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.2</strong> {isNL
                            ? 'ApartmentHub helpt de Opdrachtgever bij het vinden, beoordelen, bezichtigen, solliciteren, bieden, onderhandelen en verkrijgen van huurwoningen.'
                            : 'ApartmentHub assists the Client with finding, reviewing, viewing, applying for, offering on, negotiating and securing rental properties.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.3</strong> {isNL
                            ? 'ApartmentHub treedt op aan de zijde van de Opdrachtgever, tenzij uitdrukkelijk schriftelijk anders is overeengekomen voor een specifieke Woning.'
                            : 'ApartmentHub acts on the side of the Client, unless expressly agreed otherwise in writing for a specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.4</strong> {isNL
                            ? 'ApartmentHub is niet de verhuurder, eigenaar of Listing Side. ApartmentHub is geen partij bij enige huurovereenkomst tussen de Opdrachtgever en de verhuurder.'
                            : 'ApartmentHub is not the landlord, owner or Listing Side. ApartmentHub is not a party to any rental agreement between the Client and the landlord.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.5</strong> {isNL
                            ? 'Professionele communicatie met verhuurders, eigenaren, aanbiedende makelaars, vastgoedmanagers, relocatiebureaus of andere marktpartijen betekent niet dat ApartmentHub optreedt voor de Listing Side.'
                            : 'Professional communication with landlords, owners, listing agents, property managers, relocation agencies or other market parties does not mean that ApartmentHub acts for the Listing Side.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.6</strong> {isNL
                            ? 'ApartmentHub kan regelmatig zaken doen met dezelfde aanbiedende makelaars, vastgoedmanagers, relocatiebureaus of verhuurders op de Amsterdamse huurmarkt. Dit creëert geen opdracht van de Listing Side aan ApartmentHub en betekent niet dat ApartmentHub optreedt voor de Listing Side.'
                            : 'ApartmentHub may regularly deal with the same listing agents, property managers, relocation agencies or landlords in the Amsterdam rental market. This does not create an instruction from the Listing Side to ApartmentHub and does not mean that ApartmentHub acts for the Listing Side.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.7</strong> {isNL
                            ? 'Indien ApartmentHub met de Opdrachtgever communiceert via een ApartmentHub WhatsApp-nummer, e-mailadres, online account of teamlid in het kader van de huisvestingszoektocht van de Opdrachtgever, is deze communicatie onderdeel van de aan de Opdrachtgever verleende dienst. In die situatie wordt ApartmentHub niet betaald door de eigenaar of Listing Side voor diezelfde huurderszijde dienst, tenzij uitdrukkelijk schriftelijk anders vermeld.'
                            : 'If ApartmentHub communicates with the Client through an ApartmentHub WhatsApp number, email address, online account or team member in relation to the Client\u2019s housing search, this communication is part of the service provided to the Client. In that situation, ApartmentHub is not paid by the owner or Listing Side for that same tenant side service, unless expressly stated otherwise in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.8</strong> {isNL
                            ? 'ApartmentHub brengt geen dubbele commissie in rekening voor dezelfde Woning. ApartmentHub brengt de Opdrachtgever geen huurderszijde bemiddelingsvergoeding, Success Fee of Cancellation Fee in rekening voor een specifieke Woning indien ApartmentHub ook door de verhuurder, eigenaar of Listing Side is ingeschakeld en betaald voor de bemiddeling van diezelfde Woning, tenzij dit uitdrukkelijk is toegestaan onder dwingend Nederlands recht.'
                            : 'ApartmentHub does not charge double commission for the same Property. ApartmentHub will not charge the Client a tenant side mediation fee, Success Fee or Cancellation Fee for a specific Property if ApartmentHub is also instructed and paid by the landlord, owner or Listing Side for the mediation of that same Property, unless this is expressly permitted under mandatory Dutch law.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.9</strong> {isNL
                            ? 'Indien een onafhankelijke aanbiedende makelaar, makelaar aan verhuurderszijde, vastgoedmanager of relocatiebureau betaling ontvangt van de verhuurder of eigenaar, is dit geen betaling aan ApartmentHub en betekent dit niet dat ApartmentHub dubbele commissie in rekening brengt.'
                            : 'If an independent listing agent, landlord side broker, property manager or relocation agency receives payment from the landlord or owner, this is not a payment to ApartmentHub and does not mean that ApartmentHub charges double commission.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>3.10</strong> {isNL
                            ? 'Indien ApartmentHub verhuurderszijde diensten verleent voor een andere woning of in een aparte opdracht, heeft dit geen invloed op de rol van ApartmentHub voor de Opdrachtgever met betrekking tot een andere Woning.'
                            : 'If ApartmentHub provides landlord side services for another property or in a separate assignment, this does not affect ApartmentHub\u2019s role for the Client in relation to a different Property.'}
                    </p>
                </section>

                {/* Artikel 4 - Start van de opdracht */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 4. Start van de opdracht' : 'Article 4. Start of the Assignment'}</h2>
                    <p className={styles.paragraph}>
                        <strong>4.1</strong> {isNL
                            ? 'De opdracht start wanneer de Opdrachtgever bevestigt dat de Opdrachtgever de dienst van ApartmentHub wil gebruiken, deze algemene voorwaarden accepteert, ApartmentHub vraagt werkzaamheden uit te voeren, een bezichtiging boekt of bijwoont via ApartmentHub, ApartmentHub vraagt door te gaan met een woning, of anderszins ApartmentHub een instructie geeft.'
                            : 'The assignment starts when the Client confirms that the Client wants to use ApartmentHub\u2019s service, accepts these Terms and Conditions, asks ApartmentHub to perform work, books or attends a viewing through ApartmentHub, asks ApartmentHub to proceed with a property, or otherwise gives ApartmentHub an instruction.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.2</strong> {isNL
                            ? 'Een instructie kan worden gegeven via WhatsApp, e-mail, online formulier, website, digitale handtekening, platformbericht of enige andere schriftelijke of elektronische communicatie.'
                            : 'An instruction can be given by WhatsApp, email, online form, website, digital signature, platform message or any other written or electronic communication.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.3</strong> {isNL
                            ? 'Woorden zoals ik ga akkoord, ik ga akkoord met de algemene voorwaarden, ga verder, ga door, ik wil een bod uitbrengen, ik wil doorgaan, ik wil deze woning, of vergelijkbare bewoordingen worden beschouwd als een schriftelijke instructie.'
                            : 'Words such as I agree, I agree to the Terms and Conditions, please proceed, go ahead, I want to make an offer, I want to continue, I want this property, or similar wording are considered a written instruction.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.4</strong> {isNL
                            ? 'Door een instructie te geven, machtigt de Opdrachtgever ApartmentHub om onmiddellijk met het uitvoeren van de dienst te beginnen.'
                            : 'By giving an instruction, the Client authorises ApartmentHub to start performing the service immediately.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>4.5</strong> {isNL
                            ? 'De Opdrachtgever moet ApartmentHub onmiddellijk schriftelijk informeren indien de Opdrachtgever niet langer wil dat ApartmentHub doorgaat met een woning, bezichtiging, aanvraag, bod, huurvoorstel of Letter of Intent.'
                            : 'The Client must immediately inform ApartmentHub in writing if the Client no longer wants ApartmentHub to continue with a property, viewing, application, offer, rental proposal or Letter of Intent.'}
                    </p>
                </section>

                {/* Artikel 5 - No Cure No Pay en Success Fee */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 5. No Cure No Pay en Success Fee' : 'Article 5. No Cure No Pay and Success Fee'}</h2>
                    <p className={styles.paragraph}>
                        <strong>5.1</strong> {isNL
                            ? 'ApartmentHub werkt op basis van No Cure No Pay, tenzij uitdrukkelijk schriftelijk anders is overeengekomen.'
                            : 'ApartmentHub works on a No Cure No Pay basis, unless expressly agreed otherwise in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>5.2</strong> {isNL
                            ? 'De Success Fee wordt verschuldigd indien de Opdrachtgever door tussenkomst van ApartmentHub de mogelijkheid krijgt om een Woning te huren, is geaccepteerd of goedgekeurd voor een Woning, een huurovereenkomst of concept-huurovereenkomst voor een Woning ontvangt, een huurovereenkomst tekent, of anderszins een Woning heeft verkregen.'
                            : 'The Success Fee becomes payable if, through ApartmentHub\u2019s involvement, the Client obtains the possibility to rent a Property, is accepted or approved for a Property, receives a rental agreement or draft rental agreement for a Property, signs a rental agreement, or otherwise has a Property secured.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>5.3</strong> {isNL
                            ? 'Tenzij schriftelijk anders is overeengekomen, is de standaard Success Fee \u00e9\u00e9n maand huur exclusief btw.'
                            : 'Unless agreed otherwise in writing, the standard Success Fee is one month\u2019s rent excluding VAT.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>5.4</strong> {isNL
                            ? 'Voor Woningen met een maandhuur lager dan \u20ac 2000 kan ApartmentHub een Success Fee in rekening brengen gelijk aan twee maanden huur exclusief btw, maar alleen indien dit duidelijk is gecommuniceerd en geaccepteerd door de Opdrachtgever voordat de Opdrachtgever door gaat met die specifieke Woning.'
                            : 'For Properties with a monthly rent below EUR 2000, ApartmentHub may charge a Success Fee equal to two months\u2019 rent excluding VAT, but only if this has been clearly communicated and accepted by the Client before the Client proceeds with that specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>5.5</strong> {isNL
                            ? 'De toepasselijke Success Fee voor een specifieke Woning kan worden bevestigd in de Letter of Intent, WhatsApp, e-mail, factuur, online formulier of een andere schriftelijke bevestiging.'
                            : 'The applicable Success Fee for a specific Property may be confirmed in the Letter of Intent, WhatsApp, email, invoice, online form or another written confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>5.6</strong> {isNL
                            ? 'De Success Fee is verschuldigd v\u00f3\u00f3r de sleuteloverdracht, tenzij ApartmentHub schriftelijk anders overeenkomt.'
                            : 'The Success Fee is payable before the key transfer, unless ApartmentHub agrees otherwise in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>5.7</strong> {isNL
                            ? 'De Success Fee is separaat van enige huur, borg, servicekosten, nutsvoorzieningskosten of andere bedragen die verschuldigd zijn aan de verhuurder of Listing Side.'
                            : 'The Success Fee is separate from any rent, deposit, service costs, utility costs or other amounts payable to the landlord or Listing Side.'}
                    </p>
                </section>

                {/* Artikel 6 - Biedinstructies en actieve biedingen */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 6. Biedinstructies en actieve biedingen' : 'Article 6. Offer Instructions and Active Offers'}</h2>
                    <p className={styles.paragraph}>
                        <strong>6.1</strong> {isNL
                            ? 'Indien de Opdrachtgever ApartmentHub opdracht geeft door te gaan met een bod, aanvraag, huurvoorstel of Letter of Intent voor een specifieke Woning, geeft de Opdrachtgever ApartmentHub toestemming om de noodzakelijke stappen te nemen om die Woning voor de Opdrachtgever te proberen te verkrijgen.'
                            : 'If the Client instructs ApartmentHub to proceed with an offer, application, rental proposal or Letter of Intent for a specific Property, the Client gives ApartmentHub permission to take the necessary steps to try to secure that Property for the Client.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>6.2</strong> {isNL
                            ? 'Een Biedinstructie blijft actief totdat de Opdrachtgever deze schriftelijk intrekt v\u00f3\u00f3r Bevestiging.'
                            : 'An Offer Instruction remains active until the Client withdraws it in writing before Confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>6.3</strong> {isNL
                            ? 'Een intrekking is alleen geldig indien deze duidelijk, schriftelijk en door ApartmentHub ontvangen is v\u00f3\u00f3r Bevestiging. De Opdrachtgever moet duidelijk vermelden dat de Opdrachtgever het bod, de aanvraag, het huurvoorstel of de instructie voor de specifieke Woning intrekt.'
                            : 'A withdrawal is only valid if it is clear, written and received by ApartmentHub before Confirmation. The Client must clearly state that the Client withdraws the offer, application, rental proposal or instruction for the specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>6.4</strong> {isNL
                            ? 'ApartmentHub is niet verplicht om opnieuw te controleren of de Opdrachtgever nog interesse heeft v\u00f3\u00f3r het communiceren van Bevestiging, indien de Opdrachtgever ApartmentHub opdracht heeft gegeven door te gaan en ApartmentHub geen schriftelijke intrekking heeft ontvangen v\u00f3\u00f3r Bevestiging.'
                            : 'ApartmentHub is not required to check again whether the Client is still interested before communicating Confirmation, if the Client has instructed ApartmentHub to proceed and ApartmentHub has not received a written withdrawal before Confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>6.5</strong> {isNL
                            ? 'Indien Bevestiging wordt ontvangen v\u00f3\u00f3rdat ApartmentHub een schriftelijke intrekking van de Opdrachtgever heeft ontvangen, wordt de Woning beschouwd als verkregen voor de Opdrachtgever voor de toepassing van deze algemene voorwaarden en enige Letter of Intent.'
                            : 'If Confirmation is received before ApartmentHub has received a written withdrawal from the Client, the Property is considered secured for the Client for the purpose of these Terms and Conditions and any Letter of Intent.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>6.6</strong> {isNL
                            ? 'De Opdrachtgever blijft verantwoordelijk voor het ApartmentHub op de hoogte houden. Indien de Opdrachtgever overweegt, onderhandelt, accepteert of tekent voor een andere woning elders, moet de Opdrachtgever ApartmentHub onmiddellijk informeren indien ApartmentHub moet stoppen met werken aan een actieve Woning.'
                            : 'The Client remains responsible for keeping ApartmentHub informed. If the Client is considering, negotiating, accepting or signing for another property elsewhere, the Client must immediately inform ApartmentHub if ApartmentHub should stop working on an active Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>6.7</strong> {isNL
                            ? 'Het accepteren, tekenen of kiezen van een andere woning elders trekt een actieve Biedinstructie niet automatisch in. De Opdrachtgever moet de actieve Biedinstructie schriftelijk intrekken v\u00f3\u00f3r Bevestiging.'
                            : 'Accepting, signing or choosing another property elsewhere does not automatically withdraw an active Offer Instruction. The Client must withdraw the active Offer Instruction in writing before Confirmation.'}
                    </p>
                </section>

                {/* Artikel 7 - Letter of Intent */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 7. Letter of Intent' : 'Article 7. Letter of Intent'}</h2>
                    <p className={styles.paragraph}>
                        <strong>7.1</strong> {isNL
                            ? 'Een Letter of Intent is een woning-specifiek document waarin de Opdrachtgever de intentie bevestigt om een specifieke Woning te huren onder de in dat document vermelde voorwaarden, onder voorbehoud van acceptatie of Bevestiging.'
                            : 'A Letter of Intent is a property specific document in which the Client confirms the intention to rent a specific Property under the conditions stated in that document, subject to acceptance or Confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.2</strong> {isNL
                            ? 'Door een Letter of Intent te tekenen, bevestigt de Opdrachtgever dat de Opdrachtgever wil dat ApartmentHub door gaat met de specifieke Woning.'
                            : 'By signing a Letter of Intent, the Client confirms that the Client wants ApartmentHub to proceed with the specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.3</strong> {isNL
                            ? 'Door een Letter of Intent te tekenen, machtigt de Opdrachtgever ApartmentHub om het bod, de aanvraag of het huurvoorstel af te handelen.'
                            : 'By signing a Letter of Intent, the Client authorises ApartmentHub to handle the offer, application or rental proposal.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.4</strong> {isNL
                            ? 'Door een Letter of Intent te tekenen, begrijpt de Opdrachtgever dat de instructie actief blijft totdat deze schriftelijk is ingetrokken v\u00f3\u00f3r Bevestiging.'
                            : 'By signing a Letter of Intent, the Client understands that the instruction remains active until withdrawn in writing before Confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.5</strong> {isNL
                            ? 'Door een Letter of Intent te tekenen, begrijpt de Opdrachtgever dat annulering na Bevestiging kan leiden tot een Cancellation Fee.'
                            : 'By signing a Letter of Intent, the Client understands that cancellation after Confirmation may result in a Cancellation Fee.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.6</strong> {isNL
                            ? 'Door een Letter of Intent te tekenen, bevestigt de Opdrachtgever dat de Opdrachtgever deze algemene voorwaarden heeft gelezen en geaccepteerd.'
                            : 'By signing a Letter of Intent, the Client confirms that the Client has read and accepted these Terms and Conditions.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.7</strong> {isNL
                            ? 'De Letter of Intent kan de huur, borg, startdatum, bemiddelingsvergoeding, annuleringsvergoeding en andere relevante voorwaarden voor de specifieke Woning vermelden.'
                            : 'The Letter of Intent may state the rent, deposit, start date, agency fee, cancellation fee and other relevant conditions for the specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>7.8</strong> {isNL
                            ? 'Indien de Opdrachtgever de Letter of Intent tekent en de Woning vervolgens wordt geaccepteerd of bevestigd v\u00f3\u00f3rdat ApartmentHub een schriftelijke intrekking heeft ontvangen, is de Cancellation Fee van toepassing indien de Opdrachtgever later annuleert, intrekt, weigert door te gaan zonder geldige juridische of contractuele reden, niet meewerkt, weigert de huurovereenkomst te tekenen zonder geldige juridische of contractuele reden, of een andere woning kiest.'
                            : 'If the Client signs the Letter of Intent and the Property is subsequently accepted or confirmed before ApartmentHub receives a written withdrawal, the Cancellation Fee applies if the Client later cancels, withdraws, refuses to proceed without a valid legal or contractual reason, fails to cooperate, refuses to sign the rental agreement without a valid legal or contractual reason, or chooses another property.'}
                    </p>
                </section>

                {/* Artikel 8 - Annuleringsvergoeding */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 8. Annuleringsvergoeding' : 'Article 8. Cancellation Fee'}</h2>
                    <p className={styles.paragraph}>
                        <strong>8.1</strong> {isNL
                            ? 'Indien de Opdrachtgever annuleert, intrekt, weigert door te gaan zonder geldige juridische of contractuele reden, niet meewerkt, weigert de huurovereenkomst te tekenen zonder geldige juridische of contractuele reden, of een andere woning kiest na Bevestiging, is de Opdrachtgever een Cancellation Fee verschuldigd aan ApartmentHub.'
                            : 'If the Client cancels, withdraws, refuses to proceed without a valid legal or contractual reason, fails to cooperate, refuses to sign the rental agreement without a valid legal or contractual reason, or chooses another property after Confirmation, the Client owes ApartmentHub a Cancellation Fee.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.2</strong> {isNL
                            ? 'Tenzij schriftelijk anders is overeengekomen, is de Cancellation Fee gelijk aan de toepasselijke Success Fee voor die specifieke Woning.'
                            : 'Unless agreed otherwise in writing, the Cancellation Fee is equal to the applicable Success Fee for that specific Property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.3</strong> {isNL
                            ? 'Dit betekent dat indien de toepasselijke Success Fee \u00e9\u00e9n maand huur exclusief btw is, de Cancellation Fee \u00e9\u00e9n maand huur exclusief btw is.'
                            : 'This means that if the applicable Success Fee is one month\u2019s rent excluding VAT, the Cancellation Fee is one month\u2019s rent excluding VAT.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.4</strong> {isNL
                            ? 'Indien de toepasselijke Success Fee twee maanden huur exclusief btw is, bijvoorbeeld omdat de maandhuur lager is dan \u20ac 2000 en dit duidelijk is bevestigd v\u00f3\u00f3r het door gaan, kan de Cancellation Fee ook twee maanden huur exclusief btw zijn.'
                            : 'If the applicable Success Fee is two months\u2019 rent excluding VAT, for example because the monthly rent is below EUR 2000 and this was clearly confirmed before proceeding, the Cancellation Fee may also be two months\u2019 rent excluding VAT.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.5</strong> {isNL
                            ? 'De Cancellation Fee is verschuldigd ongeacht of de Opdrachtgever uiteindelijk de huurovereenkomst tekent, indien de Woning was bevestigd v\u00f3\u00f3rdat ApartmentHub een schriftelijke intrekking had ontvangen en de Opdrachtgever vervolgens annuleert, intrekt, weigert door te gaan zonder geldige juridische of contractuele reden, niet meewerkt, weigert te tekenen zonder geldige juridische of contractuele reden, of een andere woning kiest.'
                            : 'The Cancellation Fee is due regardless of whether the Client ultimately signs the rental agreement, if the Property was confirmed before ApartmentHub received a written withdrawal and the Client then cancels, withdraws, refuses to proceed without a valid legal or contractual reason, fails to cooperate, refuses to sign without a valid legal or contractual reason, or chooses another property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.6</strong> {isNL
                            ? 'De Cancellation Fee is niet bedoeld als straf. Het is een redelijke vaste compensatie voor reeds verrichte werkzaamheden en de gevolgen veroorzaakt door annulering na Bevestiging.'
                            : 'The Cancellation Fee is not intended as a punishment. It is a reasonable fixed compensation for work already performed and the consequences caused by cancellation after Confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.7</strong> {isNL
                            ? 'De Cancellation Fee kan onder meer dekken: de zoekwerkzaamheden verricht voor de Opdrachtgever, communicatie met de Opdrachtgever, communicatie met de Listing Side, het regelen, co\u00f6rdineren of bijwonen van bezichtigingen of videogezichtingen, het controleren of voorbereiden van documenten, het voorbereiden, indienen of afhandelen van het bod, de aanvraag, het huurvoorstel of de Letter of Intent, het onderhandelen of co\u00f6rdineren van het huurvoorstel, interne administratieve en operationele werkzaamheden, bestede tijd aan het verkrijgen van de Woning, het pauzeren, reserveren of verwijderen van de Woning uit het proces voor andere kandidaten, het herstarten van het proces en zoeken naar nieuwe kandidaten door de Listing Side, reeds gemaakte kosten voor het voorbereiden van de huurovereenkomst of gerelateerde documentatie, mogelijk verlies van huurinkomsten, vertraging of andere gevolgen voor de eigenaar of Listing Side, en verlies van tijd en opportuniteit voor ApartmentHub en andere betrokken partijen.'
                            : 'The Cancellation Fee may cover, among other things, search work performed for the Client, communication with the Client, communication with the Listing Side, arranging, coordinating or attending viewings or video viewings, checking or preparing documents, preparing, submitting or handling the offer, application, rental proposal or Letter of Intent, negotiating or coordinating the rental proposal, internal administrative and operational work, time spent securing the Property, the Property being paused, reserved or removed from the process for other candidates, the Listing Side having to restart the process and search for new candidates, costs already incurred for preparing the rental agreement or related documentation, potential vacancy loss, delay or other consequences for the owner or Listing Side, and loss of time and opportunity for ApartmentHub and other parties involved.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.8</strong> {isNL
                            ? 'De Cancellation Fee is overeengekomen als een vaste en redelijke compensatie. ApartmentHub kan, waar nodig, het type verrichte werkzaamheden en de gevolgen van de annulering toelichten, maar partijen zijn overeengekomen dat het exacte bedrag van elk afzonderlijk kostenpost niet apart berekend hoeft te worden, tenzij dwingend recht anders vereist.'
                            : 'The Cancellation Fee is agreed as a fixed and reasonable compensation. ApartmentHub may, where necessary, explain the type of work performed and the consequences caused by the cancellation, but the parties agree that the exact amount of each individual cost item does not need to be calculated separately, unless mandatory law requires otherwise.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>8.9</strong> {isNL
                            ? 'De Opdrachtgever erkent dat annulering na Bevestiging schade, vertraging, administratief werk en verlies van opportuniteit kan veroorzaken voor ApartmentHub, de Listing Side, de eigenaar en andere kandidaten.'
                            : 'The Client acknowledges that cancellation after Confirmation can cause damage, delay, administrative work and loss of opportunity for ApartmentHub, the Listing Side, the owner and other candidates.'}
                    </p>
                </section>

                {/* Artikel 9 - Weigering om de huurovereenkomst te tekenen */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 9. Weigering om de huurovereenkomst te tekenen' : 'Article 9. Refusal to Sign the Rental Agreement'}</h2>
                    <p className={styles.paragraph}>
                        <strong>9.1</strong> {isNL
                            ? 'Indien de Woning is geaccepteerd of bevestigd en de Opdrachtgever vervolgens weigert de huurovereenkomst te tekenen, wordt dit behandeld als een annulering indien de huurovereenkomst materieel in lijn is met de Letter of Intent, het geaccepteerde bod of huurvoorstel, de overeengekomen huur, borg, startdatum en huurperiode, dwingend Nederlands huurrecht, en algemeen aanvaarde standaarden voor huurovereenkomsten voor woningen in Nederland.'
                            : 'If the Property has been accepted or confirmed and the Client later refuses to sign the rental agreement, this will be treated as a cancellation if the rental agreement is materially in line with the Letter of Intent, the accepted offer or rental proposal, the agreed rent, deposit, start date and rental period, mandatory Dutch rental law, and generally accepted standards for residential tenancy agreements in the Netherlands.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.2</strong> {isNL
                            ? 'In die situatie kan de Opdrachtgever de Cancellation Fee niet vermijden door de huurovereenkomst te weigeren te tekenen zonder geldige juridische of contractuele reden.'
                            : 'In that situation, the Client cannot avoid the Cancellation Fee by refusing to sign the rental agreement without a valid legal or contractual reason.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.3</strong> {isNL
                            ? 'Geen Cancellation Fee is verschuldigd indien de Opdrachtgever weigert te tekenen omdat de definitieve huurovereenkomst een materiële afwijking bevat van de overeengekomen voorwaarden, een onrechtmatige of duidelijk onredelijke clausule bevat, of niet voldoet aan dwingend Nederlands huurrecht, mits de Opdrachtgever ApartmentHub hierover onverwijld en schriftelijk informeert.'
                            : 'No Cancellation Fee is due if the Client refuses to sign because the final rental agreement contains a material deviation from the agreed conditions, contains an unlawful or clearly unreasonable clause, or does not meet mandatory Dutch rental law, provided that the Client notifies ApartmentHub of this objection promptly and in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.4</strong> {isNL
                            ? 'Indien het probleem redelijkerwijs kan worden gecorrigeerd, moet de Opdrachtgever ApartmentHub en de Listing Side een redelijke gelegenheid geven om het probleem te corrigeren v\u00f3\u00f3r annulering zonder betaling.'
                            : 'If the issue can reasonably be corrected, the Client must give ApartmentHub and the Listing Side a reasonable opportunity to correct the issue before cancelling without payment.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>9.5</strong> {isNL
                            ? 'Kleine woordkeuzeverschillen, standaard huurclausules, administratieve details, wettelijk vereiste clausules, of clausules die gebruikelijk zijn in Nederlandse huurovereenkomsten voor woningen geven de Opdrachtgever niet automatisch het recht om zonder Cancellation Fee te annuleren.'
                            : 'Minor wording differences, standard rental clauses, administrative details, legally required clauses, or clauses that are customary in Dutch residential rental agreements do not automatically give the Client the right to cancel without a Cancellation Fee.'}
                    </p>
                </section>

                {/* Artikel 10 - Wanneer geen annuleringsvergoeding verschuldigd is */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 10. Wanneer geen annuleringsvergoeding verschuldigd is' : 'Article 10. When No Cancellation Fee Is Due'}</h2>
                    <p className={styles.paragraph}>
                        <strong>10.1</strong> {isNL
                            ? 'Geen Cancellation Fee is verschuldigd indien de Opdrachtgever de Biedinstructie schriftelijk intrekt v\u00f3\u00f3r Bevestiging.'
                            : 'No Cancellation Fee is due if the Client withdraws the Offer Instruction in writing before Confirmation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.2</strong> {isNL
                            ? 'Geen Cancellation Fee is verschuldigd indien de verhuurder of Listing Side het bod of de aanvraag van de Opdrachtgever afwijst.'
                            : 'No Cancellation Fee is due if the landlord or Listing Side rejects the Client\u2019s offer or application.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.3</strong> {isNL
                            ? 'Geen Cancellation Fee is verschuldigd indien de annulering direct wordt veroorzaakt door een materiële tekortkoming door ApartmentHub in het nakomen van haar verplichtingen, mits aan alle volgende voorwaarden is voldaan.'
                            : 'No Cancellation Fee is due if the cancellation is directly caused by a material failure by ApartmentHub to perform its obligations, provided that all of the following conditions are met.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.4</strong> {isNL
                            ? 'De Opdrachtgever moet ApartmentHub zo spoedig mogelijk schriftelijk op de hoogte hebben gesteld van de vermeende tekortkoming.'
                            : 'The Client must have notified ApartmentHub of the alleged failure in writing as soon as possible.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.5</strong> {isNL
                            ? 'ApartmentHub moet een redelijke gelegenheid hebben gekregen om het probleem te verhelpen, waar verhelping mogelijk is.'
                            : 'ApartmentHub must have been given a reasonable opportunity to remedy the issue, where remedy is possible.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.6</strong> {isNL
                            ? 'De vermeende tekortkoming moet ernstig genoeg zijn om annulering zonder betaling te rechtvaardigen.'
                            : 'The alleged failure must be serious enough to justify cancellation without payment.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.7</strong> {isNL
                            ? 'De vermeende tekortkoming moet direct de annulering hebben veroorzaakt.'
                            : 'The alleged failure must have directly caused the cancellation.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.8</strong> {isNL
                            ? 'Geen Cancellation Fee is verschuldigd indien de definitieve huurovereenkomst een materiële wijziging bevat van een essenti\u00eble voorwaarde in vergelijking met de door de Opdrachtgever geaccepteerde voorwaarden, en de Opdrachtgever die materi\u00eble wijziging onverwijld en schriftelijk afwijst.'
                            : 'No Cancellation Fee is due if the final rental agreement contains a material change to an essential condition compared with the conditions accepted by the Client, and the Client rejects that material change promptly and in writing.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.9</strong> {isNL
                            ? 'Essenti\u00eble voorwaarden omvatten het adres van de Woning, de maandhuur, borg, startdatum, huurperiode, aantal toegestane bewoners, registratiemogelijkheid en enige andere voorwaarde uitdrukkelijk vermeld als essentieel in de Letter of Intent.'
                            : 'Essential conditions include the Property address, monthly rent, deposit, start date, rental period, number of permitted occupants, registration possibility and any other condition expressly stated as essential in the Letter of Intent.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.10</strong> {isNL
                            ? 'Een wijziging is niet materieel indien deze klein, gebruikelijk, wettelijk vereist, administratief van aard, of redelijkerwijs corrigeerbaar is.'
                            : 'A change is not material if it is minor, customary, legally required, administrative in nature, or reasonably capable of being corrected.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>10.11</strong> {isNL
                            ? 'Kleine vertragingen, marktonzekerheid, ontevredenheid met timing, verandering van persoonlijke voorkeur, het kiezen van een andere woning, of het besluit om niet te verhuizen kwalificeren niet automatisch als een materi\u00eble tekortkoming door ApartmentHub.'
                            : 'Minor delays, market uncertainty, dissatisfaction with timing, a change of personal preference, choosing another property, or deciding not to move do not automatically qualify as a material failure by ApartmentHub.'}
                    </p>
                </section>

                {/* Artikel 11 - Elders gevonden woningen */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 11. Elders gevonden woningen' : 'Article 11. Properties Found Elsewhere'}</h2>
                    <p className={styles.paragraph}>
                        <strong>11.1</strong> {isNL
                            ? 'De Opdrachtgever blijft vrij om onafhankelijk of via een andere partij een andere woning te zoeken en te accepteren.'
                            : 'The Client remains free to search for and accept another property independently or through another party.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>11.2</strong> {isNL
                            ? 'De Opdrachtgever is ApartmentHub geen Success Fee verschuldigd louter omdat de Opdrachtgever onafhankelijk een andere woning huurt die niet via ApartmentHub is ge\u00efntroduceerd, geregeld, afgehandeld, aangevraagd, waarop geboden is of verkregen.'
                            : 'The Client does not owe ApartmentHub a Success Fee merely because the Client independently rents another property that was not introduced, arranged, handled, applied for, offered on or secured through ApartmentHub.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>11.3</strong> {isNL
                            ? 'Echter, indien ApartmentHub al opdracht heeft gegeven om door te gaan met een specifieke Woning en die Woning wordt bevestigd v\u00f3\u00f3rdat ApartmentHub een schriftelijke intrekking heeft ontvangen, blijft de Cancellation Fee verschuldigd indien de Opdrachtgever later annuleert, intrekt, weigert door te gaan zonder geldige juridische of contractuele reden, niet meewerkt, weigert te tekenen zonder geldige juridische of contractuele reden, of een andere woning kiest.'
                            : 'However, if ApartmentHub has already been instructed to proceed with a specific Property and that Property is confirmed before ApartmentHub receives a written withdrawal, the Cancellation Fee remains due if the Client later cancels, withdraws, refuses to proceed without a valid legal or contractual reason, fails to cooperate, refuses to sign without a valid legal or contractual reason, or chooses another property.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>11.4</strong> {isNL
                            ? 'De Opdrachtgever kan een Cancellation Fee niet vermijden door elders een andere woning te accepteren zonder eerst de actieve Biedinstructie schriftelijk in te trekken v\u00f3\u00f3r Bevestiging.'
                            : 'The Client cannot avoid a Cancellation Fee by accepting another property elsewhere without first withdrawing the active Offer Instruction in writing before Confirmation.'}
                    </p>
                </section>

                {/* Artikel 12 - Consumentenherroepingsrecht */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 12. Consumentenherroepingsrecht' : 'Article 12. Consumer Right of Withdrawal'}</h2>
                    <p className={styles.paragraph}>
                        <strong>12.1</strong> {isNL
                            ? 'Indien de Opdrachtgever een consument is en de overeenkomst met ApartmentHub op afstand is gesloten, kan de Opdrachtgever een wettelijk herroepingsrecht hebben tijdens de bedenktijd, tenzij een uitzondering van toepassing is.'
                            : 'If the Client is a consumer and the agreement with ApartmentHub is concluded at a distance, the Client may have a statutory right of withdrawal during the cooling off period, unless an exception applies.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>12.2</strong> {isNL
                            ? 'De Opdrachtgever kan ApartmentHub verzoeken om onmiddellijk met het uitvoeren van de dienst te beginnen tijdens de bedenktijd.'
                            : 'The Client may request ApartmentHub to start performing the service immediately during the cooling off period.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>12.3</strong> {isNL
                            ? 'Indien de Opdrachtgever ApartmentHub opdracht geeft om onmiddellijk met het uitvoeren van de dienst te beginnen, kan ApartmentHub onmiddellijk met de werkzaamheden beginnen.'
                            : 'If the Client instructs ApartmentHub to start performing the service immediately, ApartmentHub may start work immediately.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>12.4</strong> {isNL
                            ? 'Indien de Opdrachtgever tijdens de bedenktijd intrekt na verzoek tot onmiddellijke uitvoering, moet de Opdrachtgever een redelijk bedrag betalen voor de reeds verrichte diensten tot het moment van intrekking, tenzij dwingend recht anders bepaalt.'
                            : 'If the Client withdraws during the cooling off period after requesting immediate performance, the Client must pay a reasonable amount for the services already performed up to the moment of withdrawal, unless mandatory law provides otherwise.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>12.5</strong> {isNL
                            ? 'Indien de dienst volledig is uitgevoerd binnen de bedenktijd op uitdrukkelijk verzoek van de Opdrachtgever en met erkenning door de Opdrachtgever van de gevolgen, kan het herroepingsrecht mogelijk niet meer van toepassing zijn, voor zover toegestaan door dwingend recht.'
                            : 'If the service has been fully performed within the cooling off period at the Client\u2019s express request and with the Client\u2019s acknowledgement of the consequences, the right of withdrawal may no longer apply, to the extent permitted by mandatory law.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>12.6</strong> {isNL
                            ? 'De annuleringsregels in deze algemene voorwaarden beperken geen dwingende consumentenrechten die wettelijk niet kunnen worden uitgesloten.'
                            : 'The cancellation rules in these Terms and Conditions do not limit any mandatory consumer rights that cannot legally be excluded.'}
                    </p>
                </section>

                {/* Artikel 13 - Verplichtingen van de Opdrachtgever */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 13. Verplichtingen van de Opdrachtgever' : 'Article 13. Client Obligations'}</h2>
                    <p className={styles.paragraph}>
                        <strong>13.1</strong> {isNL
                            ? 'De Opdrachtgever moet complete, juiste en tijdige informatie verstrekken.'
                            : 'The Client must provide complete, correct and timely information.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>13.2</strong> {isNL
                            ? 'De Opdrachtgever moet meewerken aan de aanvraag, het bod en het huurproces.'
                            : 'The Client must cooperate with the application, offer and rental process.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>13.3</strong> {isNL
                            ? 'De Opdrachtgever moet ApartmentHub onmiddellijk schriftelijk informeren indien de Opdrachtgever niet langer door wil gaan met een Woning, een bod, aanvraag of Letter of Intent wil intrekken, een andere woning heeft geaccepteerd, niet langer beschikbaar is voor de voorgestelde startdatum, of als het inkomen, de werkzaamheden, de verblijfsstatus, het huishouden of de persoonlijke situatie van de Opdrachtgever verandert op een manier die van invloed kan zijn op de aanvraag.'
                            : 'The Client must immediately inform ApartmentHub in writing if the Client no longer wants to proceed with a Property, wants to withdraw an offer, application or Letter of Intent, has accepted another property, is no longer available for the proposed start date, or if the Client\u2019s income, employment, residence, household or personal situation changes in a way that may affect the application.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>13.4</strong> {isNL
                            ? 'Indien de Opdrachtgever niet tijdig informatie of medewerking verstrekt, kan ApartmentHub haar diensten opschorten.'
                            : 'If the Client fails to provide information or cooperation in time, ApartmentHub may suspend its services.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>13.5</strong> {isNL
                            ? 'Enige vertraging of gevolg veroorzaakt door ontbrekende, onjuiste of late informatie van de Opdrachtgever is voor rekening van de Opdrachtgever.'
                            : 'Any delay or consequence caused by missing, incorrect or late information from the Client is for the Client\u2019s account.'}
                    </p>
                </section>

                {/* Artikel 14 - Betaling en incasso */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 14. Betaling en incasso' : 'Article 14. Payment and Collection'}</h2>
                    <p className={styles.paragraph}>
                        <strong>14.1</strong> {isNL
                            ? 'Facturen moeten worden betaald binnen de op de factuur vermelde betalingstermijn.'
                            : 'Invoices must be paid within the payment term stated on the invoice.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>14.2</strong> {isNL
                            ? 'Indien betaling niet op tijd wordt ontvangen, kan ApartmentHub \u00e9\u00e9n of meer betalingsherinneringen sturen.'
                            : 'If payment is not received on time, ApartmentHub may send one or more payment reminders.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>14.3</strong> {isNL
                            ? 'Indien de Opdrachtgever een consument is, brengt ApartmentHub alleen wettelijke buitengerechtelijke incassokosten in rekening na het sturen van de wettelijk vereiste betalingsherinnering waarbij de Opdrachtgever minstens 14 dagen krijgt om te betalen en waarbij het bedrag aan incassokosten dat verschuldigd kan worden, wordt vermeld.'
                            : 'If the Client is a consumer, ApartmentHub will only charge statutory extrajudicial collection costs after sending the legally required payment reminder giving the Client at least 14 days to pay and stating the amount of collection costs that may become due.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>14.4</strong> {isNL
                            ? 'Indien betaling niet wordt ontvangen na de vereiste herinneringsperiode, kan ApartmentHub de zaak overdragen aan een incassobureau, advocaat of rechtbank.'
                            : 'If payment is not received after the required reminder period, ApartmentHub may transfer the matter to a collection agency, lawyer or court.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>14.5</strong> {isNL
                            ? 'Wettelijke rente en incassokosten kunnen in rekening worden gebracht in overeenstemming met de toepasselijke Nederlandse wetgeving.'
                            : 'Statutory interest and collection costs may be charged in accordance with applicable Dutch law.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>14.6</strong> {isNL
                            ? 'Een geschil over een factuur schort de betalingsverplichting niet automatisch op, tenzij ApartmentHub schriftelijk overeenkomt of dwingend recht anders bepaalt.'
                            : 'A dispute regarding an invoice does not automatically suspend the payment obligation, unless ApartmentHub agrees in writing or mandatory law provides otherwise.'}
                    </p>
                </section>

                {/* Artikel 15 - Persoonsgegevens */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 15. Persoonsgegevens' : 'Article 15. Personal Data'}</h2>
                    <p className={styles.paragraph}>
                        <strong>15.1</strong> {isNL
                            ? 'ApartmentHub verwerkt persoonsgegevens voor zover noodzakelijk voor het uitvoeren van de dienst, administratie, communicatie, aanvragen, biedingen, facturering, geschilafhandeling, wettelijke verplichtingen en het vaststellen, uitoefenen of verdedigen van juridische claims.'
                            : 'ApartmentHub processes personal data insofar as necessary for the performance of the service, administration, communication, applications, offers, invoicing, dispute handling, legal obligations and the establishment, exercise or defence of legal claims.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>15.2</strong> {isNL
                            ? 'ApartmentHub kan relevante informatie delen met de Listing Side of andere derden indien dit noodzakelijk is voor de huisvestingsaanvraag van de Opdrachtgever of indien de Opdrachtgever toestemming heeft gegeven.'
                            : 'ApartmentHub may share relevant information with the Listing Side or other third parties if this is necessary for the Client\u2019s housing application or if the Client has given permission.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>15.3</strong> {isNL
                            ? 'Indien een Woning-aanvraag niet doorgaat, voert ApartmentHub geen onnodige kredietcontroles, werkgeverscontroles of derden-delingen uit met betrekking tot die specifieke huurovereenkomst.'
                            : 'If a Property application will not proceed, ApartmentHub will not perform unnecessary credit checks, employer checks or third party sharing related to that specific tenancy.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>15.4</strong> {isNL
                            ? 'Intrekking van toestemming heeft geen invloed op verwerking die al wettig heeft plaatsgevonden v\u00f3\u00f3r intrekking.'
                            : 'Withdrawal of consent does not affect processing that has already lawfully taken place before withdrawal.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>15.5</strong> {isNL
                            ? 'ApartmentHub kan relevante persoonsgegevens, documenten en communicatie bewaren zolang als noodzakelijk is voor administratie, facturering, geschilafhandeling, wettelijke verplichtingen en juridische claims.'
                            : 'ApartmentHub may retain relevant personal data, documents and communication for as long as necessary for administration, invoicing, dispute handling, legal obligations and legal claims.'}
                    </p>
                </section>

                {/* Artikel 16 - Aansprakelijkheid */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 16. Aansprakelijkheid' : 'Article 16. Liability'}</h2>
                    <p className={styles.paragraph}>
                        <strong>16.1</strong> {isNL
                            ? 'ApartmentHub voert haar diensten uit met redelijke zorg en professionaliteit.'
                            : 'ApartmentHub performs its services with reasonable care and professionalism.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>16.2</strong> {isNL
                            ? 'ApartmentHub heeft een inspanningsverplichting en garandeert niet dat een verhuurder of Listing Side de Opdrachtgever zal accepteren.'
                            : 'ApartmentHub has an obligation of effort and does not guarantee that a landlord or Listing Side will accept the Client.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>16.3</strong> {isNL
                            ? 'ApartmentHub is niet verantwoordelijk voor beslissingen, vertragingen, vereisten, voorwaarden of gedrag van verhuurders, aanbiedende makelaars, vastgoedmanagers, relocatiebureaus of andere derden.'
                            : 'ApartmentHub is not responsible for decisions, delays, requirements, conditions or conduct of landlords, listing agents, property managers, relocation agencies or other third parties.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>16.4</strong> {isNL
                            ? 'ApartmentHub kan afgaan op informatie verstrekt door de Opdrachtgever, de Listing Side en openbare bronnen, tenzij ApartmentHub wist of redelijkerwijs had moeten weten dat de informatie onjuist was.'
                            : 'ApartmentHub may rely on information provided by the Client, the Listing Side and public sources, unless ApartmentHub knew or reasonably should have known that the information was incorrect.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>16.5</strong> {isNL
                            ? 'ApartmentHub is niet aansprakelijk voor de beslissing van de Opdrachtgever om een Woning af te wijzen, te annuleren of in te trekken, of voor de beslissing van de Opdrachtgever om door te gaan met een andere woning.'
                            : 'ApartmentHub is not liable for the Client\u2019s decision to reject, cancel or withdraw from a Property, or for the Client\u2019s decision to proceed with another property.'}
                    </p>
                </section>

                {/* Artikel 17 - Klachten */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 17. Klachten' : 'Article 17. Complaints'}</h2>
                    <p className={styles.paragraph}>
                        <strong>17.1</strong> {isNL
                            ? 'Indien de Opdrachtgever ontevreden is met de dienst van ApartmentHub, moet de Opdrachtgever ApartmentHub zo spoedig mogelijk schriftelijk informeren en de klacht duidelijk beschrijven.'
                            : 'If the Client is dissatisfied with ApartmentHub\u2019s service, the Client must inform ApartmentHub in writing as soon as possible and clearly describe the complaint.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>17.2</strong> {isNL
                            ? 'ApartmentHub zal de klacht beoordelen en binnen een redelijke termijn reageren.'
                            : 'ApartmentHub will review the complaint and respond within a reasonable period.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>17.3</strong> {isNL
                            ? 'De Opdrachtgever moet ApartmentHub een redelijke gelegenheid geven om de klacht te verhelpen, waar verhelping mogelijk is.'
                            : 'The Client must give ApartmentHub a reasonable opportunity to remedy the complaint, where remedy is possible.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>17.4</strong> {isNL
                            ? 'Een klacht schort geen betalingsverplichting automatisch op, tenzij ApartmentHub schriftelijk overeenkomt of dwingend recht anders bepaalt.'
                            : 'A complaint does not automatically suspend any payment obligation, unless ApartmentHub agrees in writing or mandatory law provides otherwise.'}
                    </p>
                </section>

                {/* Artikel 18 - Toepasselijk recht en geschillen */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 18. Toepasselijk recht en geschillen' : 'Article 18. Governing Law and Disputes'}</h2>
                    <p className={styles.paragraph}>
                        <strong>18.1</strong> {isNL
                            ? 'Op deze algemene voorwaarden en alle overeenkomsten tussen ApartmentHub en de Opdrachtgever is Nederlands recht van toepassing.'
                            : 'These Terms and Conditions and all agreements between ApartmentHub and the Client are governed by Dutch law.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>18.2</strong> {isNL
                            ? 'Geschillen zullen worden voorgelegd aan de bevoegde rechter in Nederland, tenzij dwingend recht anders bepaalt.'
                            : 'Disputes will be submitted to the competent court in the Netherlands, unless mandatory law provides otherwise.'}
                    </p>
                </section>

                {/* Artikel 19 - Splitsbaarheid */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{isNL ? 'Artikel 19. Splitsbaarheid' : 'Article 19. Severability'}</h2>
                    <p className={styles.paragraph}>
                        <strong>19.1</strong> {isNL
                            ? 'Indien enige bepaling van deze algemene voorwaarden ongeldig, vernietigbaar of niet-handhaafbaar is, blijven de overige bepalingen geldig.'
                            : 'If any provision of these Terms and Conditions is invalid, voidable or unenforceable, the remaining provisions remain valid.'}
                    </p>
                    <p className={styles.paragraphMt}>
                        <strong>19.2</strong> {isNL
                            ? 'De ongeldige, vernietigbare of niet-handhaafbare bepaling zal worden vervangen door een geldige bepaling die het doel van de oorspronkelijke bepaling zo nauwkeurig als wettelijk mogelijk weerspiegelt.'
                            : 'The invalid, voidable or unenforceable provision will be replaced by a valid provision that reflects the purpose of the original provision as closely as legally possible.'}
                    </p>
                </section>
            </div>
        </div>
    );
};

export default TermsAndConditions;