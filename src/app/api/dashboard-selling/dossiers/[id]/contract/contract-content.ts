// Full text of the Opdracht tot Dienstverlening (OTD) verkoopbemiddeling.
//
// This is the same authoritative Dutch engagement the seller reads and signs
// on the /sell portal — see buildOtdContractHtml() in
// src/app/sell/_portal/index.html. It is reproduced here as structured blocks
// so the staff "Download contract" button can render the whole agreement into
// a PDF (with the seller's signature and David's signature) without a browser
// HTML-to-PDF step. Keep the wording in sync with the portal if it changes.

export type ContractBlock =
  | { type: "lead"; text: string }
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "field"; label: string; value: string }
  | { type: "subhead"; text: string };

export type DossierLike = {
  naam?: string | null;
  straat?: string | null;
  postcode?: string | null;
  telefoon?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  taal?: string | null;
};

function nameParts(full: string | null | undefined): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

// Build the ordered list of contract blocks, filling the party/object fields
// from the dossier. Mirrors the portal's pf() helper: empty values render as
// the "to be completed" placeholder so the document is never silently blank.
export function buildContractBlocks(d: DossierLike): ContractBlock[] {
  const isNL = (d.taal ?? "nl") !== "en";
  const tbc = isNL ? "wordt aangevuld" : "to be completed";
  const v = (s: string | null | undefined) => (s && s.trim() ? s.trim() : tbc);
  const { first, last } = nameParts(d.naam);
  const phone = d.telefoon?.trim() || d.phone_e164?.trim() || "";

  const blocks: ContractBlock[] = [];
  const lead = (text: string) => blocks.push({ type: "lead", text });
  const h = (text: string) => blocks.push({ type: "h", text });
  const p = (text: string) => blocks.push({ type: "p", text });
  const li = (text: string) => blocks.push({ type: "li", text });
  const field = (label: string, value: string) => blocks.push({ type: "field", label, value: value || tbc });

  if (!isNL) {
    lead(
      "This engagement is in Dutch and is the legally binding version, governed by Dutch law. Please read it in full below before signing. Ask us for an English summary if anything is unclear."
    );
  }
  lead(
    'Deze overeenkomst (hierna: de "Opdracht") regelt de bemiddeling bij verkoop van de hieronder vermelde onroerende zaak door Apartmenthub (de "makelaar") in opdracht van de hieronder vermelde verkoper (de "opdrachtgever"). De Opdracht is opgesteld in lijn met de Algemene Consumentenvoorwaarden Makelaardij 2018, Boek 7 titel 7 BW (opdracht en bemiddeling) en de Wet ter voorkoming van witwassen en financieren van terrorisme (Wwft).'
  );

  h("1. Definities");
  p(
    "In deze Opdracht hebben de hierna volgende begrippen, telkens beginnend met een hoofdletter, de daarbij vermelde betekenis, ongeacht of zij in enkelvoud of meervoud worden gebruikt:"
  );
  li("Apartmenthub: de makelaar, statutair gevestigd te Amsterdam, ingeschreven in het Handelsregister onder KvK 74255142.");
  li("Verkoper: de in artikel 3 genoemde opdrachtgever; bij meerdere personen geldt elke verkoper hoofdelijk.");
  li("Mede-eigenaar: iedere natuurlijke of rechtspersoon die naast Verkoper rechthebbende is op het Object.");
  li("Object: de in artikel 5 omschreven onroerende zaak (woning, appartementsrecht of erfpachtrecht).");
  li("Koopsom: de tussen Verkoper en koper overeengekomen prijs voor het Object, inclusief eventuele roerende zaken.");
  li("Koopovereenkomst: de door Verkoper en koper te ondertekenen schriftelijke overeenkomst tot koop en verkoop.");
  li("Bedenktijd: de wettelijke herroepingstermijn van veertien (14) kalenderdagen op grond van BW 6:230o.");
  li("Schriftelijk: per brief, per email, of via een ondertekenbare digitale portal; email wordt gelijkgesteld aan schriftelijk in de zin van BW art. 3:37 lid 3.");
  li("Werkdag: een dag, niet zijnde zaterdag, zondag of een algemeen erkende feestdag in Nederland.");
  li("NEN 2580: de Nederlandse norm voor het meten van de oppervlakte en inhoud van vastgoed.");
  li("Wwft: de Wet ter voorkoming van witwassen en financieren van terrorisme.");
  li("AVG: de Algemene Verordening Gegevensbescherming (Verordening EU 2016/679).");
  li("Bijkomende kosten: kosten van derden zoals beschreven in artikel 17, zoals fotograaf, meetbureau en stylist.");
  li("Aanvaardingscode: de unieke alfanumerieke code die door de portal wordt gegenereerd als bewijs van digitale ondertekening.");

  h("2. Opdrachtnemer (de makelaar)");
  field("Naam", "Apartmenthub");
  field("KvK-nummer", "74255142");
  field("Vestigingsadres", "Van Baerlestraat 62-2");
  field("Postcode + plaats", "1017 PB Amsterdam");
  field("Telefoon", "+31 6 83221189");
  field("E-mailadres", "david@apartmenthub.nl");
  field("BTW-identificatienummer", "NL002403230B63");
  field("Vertegenwoordigd door", "David van Wachem");

  h("3. Opdrachtgever (de verkoper)");
  field("Voorna(a)m(en)", v(first));
  field("Achternaam", v(last));
  field("Straat + huisnummer", v(d.straat));
  field("Postcode + plaats", v(d.postcode));
  field("Telefoonnummer", v(phone));
  field("E-mailadres", v(d.email));
  p("Geboortedatum, geboorteplaats, nationaliteit, burgerlijke staat en BSN (Wwft) worden in een vervolgstap aangevuld.");

  h("4. Mede-eigenaar (indien van toepassing)");
  p("Bij gemeenschap van goederen of meerdere eigenaren moet ook de mede-eigenaar deze opdracht ondertekenen. Indien van toepassing worden de gegevens van de mede-eigenaar in een vervolgstap aangevuld.");

  h("5. Het object (de te verkopen onroerende zaak)");
  field("Adres", v(d.straat));
  field("Postcode + plaats", v(d.postcode));
  p("De vermelde oppervlakte wordt bij aanvang van de Opdracht door een door Apartmenthub ingeschakeld meetbureau gevalideerd conform NEN 2580. Het aldus vastgestelde rapport prevaleert boven de hierboven door Verkoper opgegeven oppervlakte en wordt opgenomen in de verkooppresentatie. Bij appartementsrechten geldt aanvullend dat de splitsingsakte, de splitsingstekening en het splitsingsreglement bepalend zijn voor de aanduiding, de begrenzing en het stemrecht in de VvE.");

  h("6. Mededelingsplicht verkoper (BW art. 7:17)");
  p("Verkoper meldt alle bekende gebreken die voor de koper van belang zijn (zichtbaar of verborgen). De gedetailleerde uitvraag (lekkages, vocht, houtaantasting, scheuren, fundering, asbest, bodemverontreiniging, aanschrijvingen, geluidsoverlast, verzekeringsclaims, lopende garanties en overige verborgen gebreken) wordt in een vervolgstap van de verkoopportal digitaal ingevuld en ondertekend als Bijlage A bij deze Opdracht. Bijlage A maakt integraal deel uit van deze Opdracht. Niet melding van bekende gebreken kan leiden tot schadeclaim van de koper na verkoop op grond van BW art. 7:17, vermindering van de Koopsom, dan wel gedeeltelijke ontbinding van de Koopovereenkomst.");

  h("7. Vraagprijs, oplevering en bijzondere voorwaarden");
  p("De vraagprijs, gewenste opleverdatum en bijzondere voorwaarden worden in overleg met Apartmenthub vastgesteld en in een vervolgstap vastgelegd. De vraagprijs is een uitnodiging tot het doen van een bod en bindt Verkoper niet om bij die prijs te verkopen. Wijziging van de vraagprijs, van de biedmethode of van eventuele voorbehouden gebeurt uitsluitend in overleg en Schriftelijk.");

  h("8. Werkzaamheden van Apartmenthub");
  p("Apartmenthub verricht voor de afgesproken courtage de volgende werkzaamheden, in onderlinge samenhang en gedurende de volledige looptijd van de Opdracht:");
  li("Intakegesprek met advies over vaststelling vraagprijs, doelgroep en verkoopstrategie");
  li("Ophalen kadastrale recherche, eigendomsakte en uittreksel beperkingenregister");
  li("Opvragen van splitsingsakte, splitsingstekening, splitsingsreglement, recente ALV notulen, jaarrekening en MJOP bij de VvE");
  li("Inwinnen openbare informatie bij Omgevingsloket, Stadsarchief, bestemmingsplan en BAG");
  li("Coordinatie van inmeting conform NEN 2580 door een onafhankelijk meetbureau");
  li("Beoordelen van de marktwaarde en vergelijkbare transacties (referentieselectie)");
  li("Professionele fotografie, plattegrond, video en verkooptekst voor de brochure");
  li("Publicatie op Funda, eigen kanalen en sociale media; aanmelding NVM database woningzoekenden");
  li("Organiseren, plannen en begeleiden van bezichtigingen, inclusief feedback verzameling");
  li("Screening van kandidaat kopers (Wwft light: identiteit, financierbaarheid, opmerkelijke patronen)");
  li("Voeren van onderhandelingen namens Verkoper, met advies over biedstrategie en tegenbod");
  li("Beheer en publicatie van het transparante biedlogboek (Pararius model) indien gekozen");
  li("Advies over voorbehoud financiering, bouwkundige keuring, opleverdatum en eventuele waarborgsom");
  li("Opstellen of beoordelen van de Koopovereenkomst conform het overeengekomen model");
  li("Eindcontrole van NEN conformiteit, oppervlakte vermelding en bijlagen voor ondertekening");
  li("Instructie naar en keuze ondersteuning voor de notaris, en begeleiding tot aan de notariele overdracht");
  li("Doorlopende terugkoppeling van reacties, bezichtigingen en biedingen aan Verkoper");

  h("9. Exclusiviteit (eenmakelaars-opdracht)");
  p("De Opdracht wordt verleend op basis van exclusiviteit. Gedurende de looptijd schakelt Verkoper geen andere makelaar, bemiddelaar of verkoopplatform in voor de verkoop van het Object, en verricht Verkoper geen concurrerende verkoopactiviteiten die de uitvoering van deze Opdracht kunnen belemmeren of doorkruisen. Wanneer Verkoper deze exclusiviteit schendt, blijft de volledige courtage verschuldigd ook indien de Koopovereenkomst via een derde partij tot stand komt.");

  h("10. Duur en opzegging van de opdracht");
  p("De Opdracht wordt aangegaan voor een periode van DRIE (3) maanden, ingaande op de dag van ondertekening. De Opdracht wordt na afloop telkens stilzwijgend verlengd met opnieuw drie maanden, tenzij een van beide partijen uiterlijk een (1) maand voor het einde van de lopende periode Schriftelijk opzegt per email aan david@apartmenthub.nl. Tussentijdse opzegging is voor beide partijen mogelijk met inachtneming van een opzegtermijn van een (1) maand. Bij overlijden van Verkoper eindigt de Opdracht, tenzij erfgenamen aangeven de Opdracht te willen handhaven.");

  h("11. Beeindiging door Apartmenthub");
  p("Apartmenthub kan de Opdracht eenzijdig teruggeven indien daartoe gewichtige redenen bestaan, waaronder maar niet beperkt tot: een belangenconflict, ernstige verstoring van de samenwerking, het niet of niet tijdig nakomen door Verkoper van diens verplichtingen (artikel 21), gegronde vermoedens dat Verkoper onjuiste of onvolledige informatie heeft verstrekt, of het niet kunnen voldoen aan verplichtingen onder de Wwft (artikel 19). Apartmenthub bevestigt de teruggave Schriftelijk en gemotiveerd.");

  h("12. Wanneer is de opdracht vervuld");
  p('De Opdracht is vervuld zodra de Koopovereenkomst door beide partijen is ondertekend, alle opschortende voorwaarden zijn vervuld en de wettelijke Bedenktijd is verstreken. Komt na beeindiging van de Opdracht binnen DRIE (3) maanden een Koopovereenkomst tot stand met een door Apartmenthub aangedragen kandidaat koper, dan is eveneens de volledige courtage verschuldigd ("beschermingsperiode").');

  h("13. Toedeling bij scheiding, overlijden of schenking");
  p("Indien tijdens de looptijd het Object geheel of gedeeltelijk wordt toebedeeld aan een van de eigenaren, de echtgenoot, partner of een derde, eindigt de Opdracht. De courtage wordt in dat geval berekend over de waarde van het toegedeelde aandeel. Partijen kunnen Schriftelijk andere afspraken maken over de berekening; bij gebreke van overeenstemming wordt de waarde vastgesteld door een door Apartmenthub aan te wijzen onafhankelijke taxateur.");

  h("14. Niet-uitvoering van een gesloten koopovereenkomst");
  p("Indien een door beide partijen ondertekende Koopovereenkomst, na verstrijken van opschortende voorwaarden en de wettelijke Bedenktijd, niet wordt uitgevoerd doordat een partijen niet meewerkt aan de levering, blijft de volledige courtage verschuldigd. Een door koper verbeurde waarborgsom of contractuele boete komt na voldoening van de courtage en eventuele kosten van de notaris toe aan Verkoper.");

  h("15. Courtage (no cure, no pay)");
  p('De courtage bedraagt EEN PROCENT (1%) van de gerealiseerde Koopsom, exclusief 21 procent BTW. Komt geen Koopovereenkomst tot stand, dan is geen courtage verschuldigd ("no cure, no pay"). De courtage wordt rechtstreeks bij de notariele overdracht ingehouden op de Koopsom en aan Apartmenthub voldaan.');
  p("Bij meerdere opdrachtgevers (Mede eigenaren) is ieder hoofdelijk aansprakelijk voor de volledige courtage en alle bijkomende verplichtingen uit deze Opdracht. Bij executieverkoop, openbare veiling of onderhandse verkoop in het kader van een executoriaal traject is de courtage verschuldigd indien Apartmenthub de koper heeft aangedragen of de transactie heeft begeleid.");

  h("16. Bijkomende kosten (vooraf betaald, verrekend bij verkoop)");
  p("Voor de aanvang van de verkoop schakelt Apartmenthub externe partijen in voor in elk geval: het inmeten van het Object conform NEN 2580 (oppervlakte rapport door een meetbureau) en professionele fotografie. Afhankelijk dat het Object kunnen daarnaast plattegrond, drone opnames, video of stylingadvies worden ingezet. Deze aanloopkosten worden direct na opdracht door Apartmenthub aan Verkoper gefactureerd op basis van werkelijke kosten, en zijn binnen veertien (14) dagen na factuurdatum door Verkoper te voldoen, ongeacht of het Object uiteindelijk verkocht wordt.");
  p("Bij succesvolle verkoop worden de door Verkoper voldane aanloopkosten verrekend met de bij notariele overdracht verschuldigde courtage. Daarnaast kunnen voorgeschoten kosten voor openbare stukken (Kadaster aktes circa EUR 19,85 per akte, KvK uittreksel VvE circa EUR 2,50) op werkelijke basis worden doorbelast.");

  h("17. Intrekkingskosten");
  p("Verkoper kan de Opdracht te allen tijde Schriftelijk intrekken. Apartmenthub brengt GEEN intrekkingskosten in rekening. Reeds gemaakte aanloopkosten (artikel 16) blijven wel verschuldigd en worden niet gerestitueerd. Intrekking laat onverlet de werking van artikel 12 (beschermingsperiode), artikel 13 (toedeling) en artikel 14 (niet uitvoering).");

  h("18. Betaling, rente en incasso");
  p("Voor zover betaling niet via de notaris bij overdracht plaatsvindt, stuurt Apartmenthub een gespecificeerde factuur met een betalingstermijn van veertien (14) dagen. Bij niet tijdige betaling stuurt Apartmenthub een betalingsherinnering met een hersteltermijn van veertien dagen. Wordt vervolgens niet betaald, dan is Verkoper in verzuim en is de wettelijke rente verschuldigd vanaf de oorspronkelijke vervaldag. Vanaf dat moment zijn ook buitengerechtelijke incassokosten verschuldigd conform het Besluit vergoeding voor buitengerechtelijke incassokosten (BIK).");

  h("19. Wwft identificatie en sanctiewetten");
  p("Apartmenthub is op grond van de Wet ter voorkoming van witwassen en financieren van terrorisme (Wwft) en de Sanctiewet 1977 verplicht om voor en tijdens de uitvoering van deze Opdracht een client onderzoek uit te voeren. Dit onderzoek omvat ten minste de volgende stappen, die Verkoper verplicht is te ondersteunen:");
  li("Identificatie en verificatie van Verkoper en, indien van toepassing, van de uiteindelijk belanghebbende (UBO) van een rechtspersoon.");
  li("Vaststelling van de aard en het doel van de transactie en van de herkomst van de middelen waarmee het Object destijds is verworven.");
  li("Toetsing aan de EU sanctielijsten en de Nationale Sanctielijst Terrorisme van het Ministerie van Buitenlandse Zaken.");
  li("Toetsing of Verkoper, een Mede eigenaar of de uiteindelijk belanghebbende een politiek prominent persoon (PEP) is in de zin van art. 1 Wwft.");
  li("Doorlopende monitoring tijdens de looptijd: ongebruikelijke wijzigingen, contante stortingen of constructies kunnen leiden tot een melding.");
  p('Indien Verkoper niet meewerkt aan dit onderzoek, of indien een sanctiehit, PEP score of materiele afwijking in de herkomst van middelen niet bevredigend kan worden weggenomen, is Apartmenthub gerechtigd de Opdracht per direct te weigeren of te beeindigen, zonder gehouden te zijn tot enige schadevergoeding. Apartmenthub is bij een redelijk vermoeden van witwassen of sanctieovertreding wettelijk verplicht een melding te doen bij FIU Nederland (artikel 16 Wwft), zonder Verkoper hiervan op de hoogte te stellen ("tipping off" verbod, artikel 23 Wwft).');

  h("20. Verplichtingen van de verkoper");
  p("Verkoper verstrekt Apartmenthub alle benodigde en juiste informatie en documenten, verleent medewerking aan identificatie in het kader van de Wwft (artikel 19), en stelt Apartmenthub in staat aan haar wettelijke verplichtingen te voldoen. Verkoper heeft een wettelijke mededelingsplicht (BW art. 7:17): alle bekende gebreken die voor de koper van belang zijn moeten worden gemeld (zie artikel 6).");
  p("Tijdens de looptijd onthoudt Verkoper zich van activiteiten die Apartmenthub kunnen belemmeren bij het uitvoeren van de Opdracht. Verkoper voert niet zelf onderhandelingen met kandidaat kopers en sluit geen Koopovereenkomst buiten Apartmenthub om (zie artikel 9 over exclusiviteit). Door of via Verkoper aangedragen kandidaat kopers worden direct doorgeleid naar Apartmenthub.");
  p("Wijzigingen in vraagprijs, verkoopstrategie of biedmethode worden uitsluitend doorgevoerd na Schriftelijke instemming tussen Verkoper en Apartmenthub. Verkoper meldt onverwijld aan Apartmenthub: (a) gebreken die na ondertekening van de Opdracht bekend worden, (b) ontvangen aanschrijvingen, (c) voorgenomen verbouwingen of wijzigingen aan het Object, (d) wijzigingen in de eigendomssituatie of beslagleggingen, en (e) ontbinding of poging tot ontbinding van een reeds gesloten Koopovereenkomst door koper.");

  h("21. Verplichtingen van Apartmenthub");
  p("Apartmenthub voert de Opdracht zorgvuldig, deskundig en in het belang van Verkoper uit. Apartmenthub heeft een inspanningsverplichting (geen resultaatverplichting) in de zin van BW art. 7:401. Apartmenthub treedt op als bemiddelaar en bezit geen volmacht om namens Verkoper bindende rechtshandelingen te verrichten, tenzij Verkoper hiervoor Schriftelijk volmacht heeft verleend. Apartmenthub houdt Verkoper regelmatig op de hoogte van vorderingen en koppelt iedere bezichtiging en ieder bod binnen twee Werkdagen terug.");
  p("Apartmenthub treedt nooit tegelijkertijd op voor koper en verkoper van hetzelfde Object en accepteert geen tweezijdige courtage. Indien tijdens de Opdracht een belangenconflict ontstaat, wordt Verkoper hierover direct geinformeerd. Apartmenthub voldoet aan de wettelijke eisen ten aanzien van haar bedrijfsvoering, deskundigheidsbevordering en klachtafhandeling, en houdt een geldige beroepsaansprakelijkheidsverzekering aan (zie artikel 23).");

  h("22. Verklaringen en garanties van verkoper");
  p("Verkoper verklaart en garandeert Apartmenthub uitdrukkelijk dat, op het moment van ondertekening van deze Opdracht en gedurende de looptijd:");
  li("(a) Verkoper handelingsbekwaam en beschikkingsbevoegd is om het Object te verkopen en te leveren;");
  li("(b) Verkoper de enige eigenaar is, dan wel beschikt over de Schriftelijke instemming van iedere Mede eigenaar;");
  li("(c) het Object niet onderworpen is aan beslag, retentierecht of pandrecht buiten de aan Apartmenthub gemelde hypotheek;");
  li("(d) er geen aanhangige, dreigende of in het verleden ingestelde procedure bestaat die de verkoop kan raken;");
  li("(e) er geen voorkeursrechten, optierechten, koop of huurrechten van derden op het Object rusten die niet zijn gemeld;");
  li("(f) alle VvE bijdragen, reserveringen voor groot onderhoud en eventuele suppleties tijdig en volledig zijn voldaan;");
  li("(g) de erfpacht canon en eventuele indexering tijdig en volledig zijn voldaan, en de erfpachtvoorwaarden zijn nageleefd;");
  li("(h) alle aan Apartmenthub verstrekte informatie, gegevens en documenten volledig, juist en niet misleidend zijn;");
  li("(i) Verkoper Apartmenthub onverwijld zal informeren over iedere wijziging die afbreuk doet aan een van de bovenstaande verklaringen.");
  p("Schending van een of meer van deze verklaringen kan leiden tot beeindiging van de Opdracht door Apartmenthub (artikel 11), tot aansprakelijkheid van Verkoper voor de daaruit voortvloeiende schade en tot vrijwaring jegens koper conform artikel 26.");

  h("23. Beroepsaansprakelijkheidsverzekering");
  p("Apartmenthub heeft een doorlopende beroepsaansprakelijkheidsverzekering afgesloten met een dekking van ten minste EUR 2.500.000 per aanspraak en EUR 5.000.000 per verzekeringsjaar, onder voorwaarden gebruikelijk in de makelaardij. Een uittreksel van de polis is op verzoek beschikbaar voor Verkoper.");

  h("24. Aansprakelijkheid");
  p("De aansprakelijkheid van Apartmenthub voor schade voortvloeiend uit of in verband met de uitvoering van deze Opdracht is beperkt tot het bedrag dat in het betreffende geval door de beroepsaansprakelijkheidsverzekeraar van Apartmenthub wordt uitgekeerd, vermeerderd met het eigen risico. Indien de verzekeraar om welke reden dan ook niet tot uitkering overgaat, is de aansprakelijkheid van Apartmenthub beperkt tot maximaal het bedrag van de in dat geval verschuldigde betaalde courtage exclusief BTW.");
  p("Apartmenthub is niet aansprakelijk voor: (a) schade veroorzaakt door onjuiste of onvolledige informatie van Verkoper of derden; (b) handelen of nalaten van koper, notaris, taxateur, hypotheekverstrekker, meetbureau, fotograaf of andere derde partijen; (c) gevolgschade, gederfde winst, overstroming of immateriele schade; (d) schade als gevolg van vertraging in DNS, internet of externe portaal diensten (Funda, Kadaster, Omgevingsloket, Pararius). Vorderingen tot schadevergoeding vervallen door verloop van een (1) jaar na het moment waarop Verkoper bekend werd of redelijkerwijs bekend kon zijn met de schade.");

  h("25. Overmacht (force majeure)");
  p("Onder overmacht wordt mede verstaan, naast hetgeen daaromtrent in de wet en jurisprudentie wordt begrepen: storingen of uitval van IT systemen, hosting, email of telefonie; het tekortschieten of niet leveren door derden zoals Funda, Kadaster, KvK, Omgevingsloket, notarissen, fotografen of meetbureaus; oorlog, oorlogsgevaar, mobilisatie of terrorisme; pandemie, epidemie of vergelijkbare volksgezondheidsmaatregel; overheidsmaatregelen waaronder lockdowns of contactbeperkingen; staking, bezetting of werkonderbreking; brand, overstroming, aardbeving of extreem weer; en fundamentele verstoring van de woningmarkt waardoor uitvoering redelijkerwijs niet kan worden gevergd.");
  p("Gedurende overmacht worden de wederzijdse verplichtingen uit deze Opdracht opgeschort, zonder dat een van partijen tot enige schadevergoeding gehouden is. Apartmenthub spant zich in om Verkoper zo spoedig mogelijk te informeren over aard, omvang en verwachte duur. Indien de overmachtssituatie langer duurt dan negentig (90) kalenderdagen, is ieder van partijen gerechtigd de Opdracht Schriftelijk te beeindigen, zonder dat over en weer aanspraak bestaat op schadevergoeding.");

  h("26. Vrijwaring en beeldmateriaal");
  p("Verkoper vrijwaart Apartmenthub voor aanspraken van koper of derden ter zake van open en verborgen gebreken aan het Object waarvan Verkoper kennis had of behoorde te hebben, alsmede voor aanspraken voortvloeiend uit onjuiste of onvolledige informatie verstrekt door Verkoper of een door Verkoper ingeschakelde derde. Verkoper verleent Apartmenthub het niet exclusieve, royaltyvrije recht om fotos, plattegronden, videos en verkoopteksten die in het kader van deze Opdracht zijn gemaakt, ook na beeindiging van de Opdracht te gebruiken voor referentie, portfolio en marketingdoeleinden van Apartmenthub, mits zonder vermelding van persoonsgegevens van Verkoper of koper.");

  h("27. Geheimhouding");
  p("Partijen behandelen alle informatie die zij over en weer uitwisselen in het kader van deze Opdracht strikt vertrouwelijk. Onder vertrouwelijke informatie valt in elk geval: financiele gegevens, persoonsgegevens, biedingen en hun hoogte, de identiteit van bieders, onderhandelingsstrategie, taxatierapporten en interne communicatie. Vertrouwelijke informatie wordt uitsluitend gebruikt voor het doel waarvoor zij is verstrekt en wordt niet gedeeld met derden, behoudens: (a) een wettelijke plicht tot openbaarmaking, (b) een gerechtelijk bevel, (c) een Wwft melding aan FIU Nederland, en (d) verstrekking aan adviseurs of sub opdrachtnemers die zelf aan een vergelijkbare geheimhouding zijn gebonden. De geheimhoudingsplicht blijft van kracht gedurende vijf (5) jaar na de beeindiging van de Opdracht.");

  h("28. Privacy en gegevensverwerking (AVG)");
  p("Apartmenthub verwerkt persoonsgegevens van Verkoper en kopers uitsluitend ten behoeve van de uitvoering van deze Opdracht. Vastgelegd worden onder meer: naam, contactgegevens, BSN (alleen voor Wwft identificatie), objectgegevens (foto, oppervlakte, vraagprijs, kadastraal), reden verkoop en transactiegegevens. Gegevens worden alleen gedeeld met noodzakelijke partijen (Funda, notaris, kandidaat kopers, door Apartmenthub ingeschakelde derden zoals fotografen en plattegrondtekenaars) en met partijen aan wie Apartmenthub op grond van wettelijke verplichtingen of een gerechtelijk bevel gegevens moet verstrekken.");
  p("Bewaartermijn: zeven (7) jaar fiscaal, daarna vernietiging. Verkoper heeft recht op inzage, rectificatie, verwijdering, beperking van verwerking, dataportabiliteit en bezwaar; verzoeken via david@apartmenthub.nl. Klachten kunnen ook worden ingediend bij de Autoriteit Persoonsgegevens (www.autoriteitpersoonsgegevens.nl). Apartmenthub mag ten behoeve van de uitvoering een verwerkersovereenkomst sluiten met derden die persoonsgegevens namens Apartmenthub verwerken.");

  h("29. Wettelijke bedenktijd");
  p("Indien deze Opdracht tot stand komt buiten de bedrijfsruimte van Apartmenthub of op afstand (per email, telefoon of digitale ondertekening), heeft Verkoper als consument een wettelijke Bedenktijd van VEERTIEN (14) kalenderdagen, ingaande op de dag na ondertekening, waarin de Opdracht zonder opgave van redenen kan worden herroepen. Herroeping geschiedt Schriftelijk per email aan david@apartmenthub.nl, dan wel via het hieronder opgenomen Modelformulier voor herroeping. Tijdige verzending van de herroeping binnen de termijn volstaat om het herroepingsrecht uit te oefenen (BW art. 6:230o).");
  p("Indien Verkoper Apartmenthub uitdrukkelijk verzoekt om binnen de Bedenktijd reeds met de uitvoering te starten, en de Opdracht vervolgens binnen de Bedenktijd herroept, is Verkoper aan Apartmenthub een evenredig deel verschuldigd van de tot het moment van herroeping reeds verrichte werkzaamheden en gemaakte Bijkomende kosten. Dit verzoek wordt in de verkoopportal expliciet vastgelegd. Bij herroeping na een reeds gesloten Koopovereenkomst zijn de gevolgen van artikel 14 onverkort van toepassing.");

  h("30. Modelformulier voor herroeping (Bijlage I Boek 6 BW)");
  p("Dit formulier alleen invullen en terugzenden als Verkoper de Opdracht wenst te herroepen. Verzenden per email aan david@apartmenthub.nl, of per post aan Apartmenthub, Van Baerlestraat 62-2, 1017 PB Amsterdam.");
  p("Aan: Apartmenthub, Van Baerlestraat 62-2, 1017 PB Amsterdam, email david@apartmenthub.nl. Ik/Wij deel/delen u hierbij mede dat ik/wij onze overeenkomst betreffende de verkoopbemiddeling van de onroerende zaak gelegen aan [adres], met kenmerk [aanvaardingscode], herroep/herroepen. Besteld op [datum] / ontvangen op [datum]. Naam consument(en). Adres consument(en). Handtekening van consument(en) (alleen wanneer dit formulier op papier wordt ingediend). Datum.");

  h("31. Klachten");
  p("Klachten worden in twee fasen behandeld. Fase 1: Verkoper meldt de klacht eerst Schriftelijk bij Apartmenthub via david@apartmenthub.nl, met een duidelijke omschrijving en onderbouwing. Apartmenthub bevestigt ontvangst binnen twee (2) Werkdagen en spant zich in om binnen twee (2) weken een passende oplossing voor te stellen. Fase 2: leidt de oplossing niet tot overeenstemming, dan kan Verkoper het geschil binnen twaalf (12) maanden na de eerste melding voorleggen aan de Geschillencommissie Makelaardij conform artikel 32. Het indienen van een klacht ontslaat Verkoper niet van zijn betalingsverplichtingen voor het onbetwiste deel van de factuur.");

  h("32. Geschillen en toepasselijk recht");
  p("Op deze Opdracht is uitsluitend Nederlands recht van toepassing. Leidt een klacht (artikel 31) niet tot een oplossing, dan kan Verkoper het geschil binnen 12 maanden na indiening van de klacht voorleggen aan de Geschillencommissie Makelaardij (Bordewijklaan 46, Den Haag, www.degeschillencommissie.nl). Voor geschillen over schadeaansprakelijkheid is de Geschillencommissie bevoegd tot schades van EUR 10.000. Verkoper kan ook kiezen voor de bevoegde rechter te Amsterdam. Apartmenthub kiest bij eigen vordering altijd voor de bevoegde rechter te Amsterdam.");

  h("33. Overdracht van rechten en verplichtingen");
  p("Geen van partijen is gerechtigd haar rechten of verplichtingen uit deze Opdracht geheel of gedeeltelijk over te dragen aan een derde, dan wel een derde in haar plaats te doen treden door contractsovername in de zin van BW art. 6:159, zonder voorafgaande Schriftelijke toestemming van de andere partij. Toestemming wordt niet op onredelijke gronden onthouden. Apartmenthub is bevoegd ten behoeve van de uitvoering van deze Opdracht sub opdrachtnemers in te schakelen overeenkomstig artikel 16, zonder dat daarvoor voorafgaande toestemming van Verkoper vereist is.");

  h("34. Notificaties en kennisgevingen");
  p("Alle formele kennisgevingen tussen partijen geschieden Schriftelijk per email. Apartmenthub is bereikbaar op verkoop@apartmenthub.nl (zaakgerelateerd) en david@apartmenthub.nl (formele kennisgevingen, opzegging, klachten). Verkoper is bereikbaar op het emailadres dat in artikel 3 is opgegeven. Email wordt gelijkgesteld aan schriftelijk in de zin van BW art. 3:37 lid 3 jo. art. 6:227b. Een kennisgeving geldt als ontvangen 24 uur na verzending, tenzij de verzender binnen die termijn een non delivery of bounce bericht heeft ontvangen, in welk geval de kennisgeving onverwijld op andere wijze (post of telefoon) wordt herhaald.");

  h("35. Nawerking na beeindiging");
  p("Beeindiging van deze Opdracht laat onverlet de werking van de bepalingen die naar hun aard bedoeld zijn ook na beeindiging te blijven gelden. Uitdrukkelijk blijven van kracht na beeindiging: artikel 12 (beschermingsperiode en courtage), artikel 14 (niet uitvoering), artikel 15 (courtage), artikel 16 (Bijkomende kosten), artikel 24 (aansprakelijkheid), artikel 26 (vrijwaring en beeldmateriaal), artikel 27 (geheimhouding), artikel 28 (AVG), artikel 32 (geschillen) en artikel 33 (overdracht van rechten).");

  h("36. Gehele overeenkomst en overige bepalingen");
  p("Deze Opdracht, samen met Bijlage A (Mededelingsplicht), Bijlage B (Lijst van zaken) en Bijlage C (Modelformulier herroeping), vormt de volledige overeenkomst tussen partijen en treedt in de plaats van alle eerdere mondelinge of schriftelijke communicatie, aanbiedingen, offertes en afspraken over hetzelfde onderwerp. Wijzigingen of aanvullingen zijn alleen geldig indien Schriftelijk overeengekomen en door beide partijen ondertekend. Indien een bepaling nietig of vernietigbaar blijkt, blijven de overige bepalingen onverkort van kracht; partijen vervangen de bepaling door een geldige bepaling die het doel en de strekking van de oorspronkelijke bepaling zoveel mogelijk benadert.");

  h("37. Bijlagen");
  p("De volgende bijlagen maken onlosmakelijk deel uit van deze Opdracht. De inhoudelijke teksten worden door separate scripts en/of de verkoopportal gegenereerd en door Verkoper afzonderlijk geparafeerd:");
  li("Bijlage A Mededelingsplicht verkoper (wordt later digitaal aangevuld door Verkoper)");
  li("Bijlage B Lijst van zaken (wordt later digitaal aangevuld door Verkoper)");
  li("Bijlage C Modelformulier herroeping bedenktijd (zie ook artikel 30)");

  h("38. Door verkoper te overleggen documenten");
  p("Verkoper levert bij of na ondertekening de volgende stukken aan (voor zover beschikbaar):");
  li("Kopie geldig identiteitsbewijs Verkoper (en Mede eigenaar)");
  li("Eigendomsakte / leveringsakte (Apartmenthub haalt deze anders op via Kadaster)");
  li("Bij appartementsrecht: splitsingsakte + tekening, recente notulen ALV, jaarrekening + begroting VvE, MJOP, opstalverzekeringspolis, KvK uittreksel VvE");
  li("Hypotheekgegevens (pro forma aflosnota), alleen indien hypotheek aanwezig");
  li("Erfpachtstukken, alleen bij erfpacht (Amsterdam: via mijn.amsterdam.nl)");
  li("Energielabel, indien aanwezig (anders vraagt Apartmenthub aan via EP online)");
  li("Lijst van zaken (Apartmenthub levert template)");
  li("Eventuele garantiebewijzen, asbestinventarisatie, funderingsonderzoek, bouwtekeningen");

  h("39. Digitale ondertekening");
  p("Deze Opdracht wordt digitaal aanvaard via de verkoopportal van Apartmenthub op apartmenthub.nl/verkoop. Door Verkoper te bevestigen via de aanvaard knop op de portal verklaart Verkoper deze Opdracht inclusief alle artikelen en bijlagen te hebben gelezen, begrepen en zonder voorbehoud aanvaard. De digitale aanvaarding heeft dezelfde rechtsgeldigheid als een handgeschreven handtekening (BW art. 3:15a). Na aanvaarding ontvangt Verkoper deze Opdracht per email, voorzien van naam, datum, tijdstip en een unieke Aanvaardingscode als bewijs van ondertekening. Een afschrift wordt bewaard door Apartmenthub conform de bewaartermijn uit artikel 28.");

  return blocks;
}
