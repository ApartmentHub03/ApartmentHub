import { useServiceContacts } from '@/hooks/useServiceContacts';
import { useCity } from '@/contexts/CityContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Phone, Mail, Search, Eye, Handshake, FileSignature, Sparkles, UserCheck, Building2,
  CheckCircle2, ClipboardList, MessageCircle,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import ReviewsBadge from '@/components/landing/ReviewsBadge';
import QuickContactStrip from '@/components/landing/QuickContactStrip';
import PricingCallout from '@/components/landing/PricingCallout';
import NeighborhoodPrices from '@/components/NeighborhoodPrices';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/Reveal';
import { ExpandableStepCard } from '@/components/motion/ExpandableStepCard';

const cityLabel = (c: string | null) => (c === 'utrecht' ? 'Midden Nederland' : 'Amsterdam');

const steps = [
  { icon: UserCheck, title: '1. Intake gesprek', desc: 'We bespreken je wensen, budget en zoekgebied in een persoonlijk gesprek.', detail: 'In een persoonlijk gesprek brengen we je woonwensen, budget, financieringsmogelijkheden en zoekgebied helder in kaart. We bespreken de actuele marktsituatie en stellen samen een realistisch en strategisch zoekprofiel op.' },
  { icon: Search, title: '2. Selectie & bezichtigingen', desc: 'Wij selecteren passende woningen, ook off-market, en plannen bezichtigingen.', detail: 'We selecteren actief passende woningen via Funda, ons eigen netwerk en off-market kanalen. Je krijgt alleen relevante objecten doorgestuurd en wij plannen en begeleiden de bezichtigingen met een objectieve checklist.' },
  { icon: Handshake, title: '3. Onderhandeling & bod', desc: 'Strategische onderhandeling om de beste prijs en voorwaarden voor jou te krijgen.', detail: 'We bepalen samen de biedstrategie op basis van marktdata, vergelijkbare verkopen en de situatie van de verkoper. Vervolgens onderhandelen wij namens jou op prijs én voorwaarden zoals ontbindende voorwaarden, opleverdatum en roerende zaken.' },
  { icon: FileSignature, title: '4. Overdracht bij notaris', desc: 'Begeleiding tot en met de sleuteloverdracht bij de notaris.', detail: 'We controleren de koopovereenkomst, bewaken de ontbindende voorwaarden en termijnen, en coördineren met hypotheekadviseur en notaris. Bij de sleuteloverdracht staan we naast je voor een soepele afronding.' },
];

const usps = [
  { icon: Eye, title: 'Off-market aanbod', desc: 'Toegang tot woningen die nog niet op Funda staan via ons netwerk.' },
  { icon: Sparkles, title: 'Persoonlijke begeleiding', desc: 'Eén vast aanspreekpunt van zoektocht tot sleuteloverdracht.' },
  { icon: Building2, title: 'Notariskeuze', desc: 'Vrije keuze van notaris en onafhankelijke advisering.' },
];

const services = [
  'Inventarisatie van wensen, budget en zoekgebied',
  "Toegang tot ons off-market netwerk (NVM collega's, ontwikkelaars, eerdere klanten)",
  'Onafhankelijk marktonderzoek per pand (kadaster, VvE, erfpacht)',
  'Bezichtigingsbegeleiding met objectieve checklist',
  'Coördinatie met hypotheekadviseur (wij hebben vaste partners)',
  'Bouwkundige keuring laten uitvoeren waar zinvol',
  'Onderhandeling namens jou met de verkopende makelaar',
  'Begeleiding tot en met sleuteloverdracht bij notaris',
];

const Koop = () => {
  const { city } = useCity();
  
  const contacts = useServiceContacts('koop');
  const cityName = cityLabel(city);
  const telHref = `tel:${contacts.phone.replace(/\s/g, '')}`;
  const reduce = useReducedMotion();
  const heroFade = reduce
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-background to-muted py-12 md:py-24">
        <motion.div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" {...heroFade}>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Vind je droomwoning in {cityName}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            Persoonlijke aankoopbegeleiding van A tot Z. 1% courtage exclusief BTW, no cure no pay.
          </p>
          <div className="flex justify-center mb-6">
            <ReviewsBadge />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-orange hover:bg-orange/90 text-white btn-pop">
              <Link to="/koop/lead">Vul intake-formulier in</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="btn-pop">
              <Link to="/koopkracht">Bereken wat je kunt kopen</Link>
            </Button>
            <a href={telHref} className="text-2xl md:text-3xl font-bold text-myrtle hover:underline">
              {contacts.phone}
            </a>
            <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-myrtle text-myrtle hover:bg-myrtle/10 transition-colors btn-pop" aria-label="WhatsApp">
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
          <QuickContactStrip />
        </motion.div>
      </section>

      {/* Pricing callout */}
      <PricingCallout />

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12">Hoe werkt het?</h2>
          </Reveal>
          <StaggerGroup className="flex flex-wrap justify-center gap-6">
            {steps.map((s) => (
              <StaggerItem key={s.title} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
                <ExpandableStepCard icon={s.icon} title={s.title} desc={s.desc} detail={s.detail} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* USPs */}
      <section className="py-16 md:py-24 bg-mintcream/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12">Waarom ApartmentHub</h2>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {usps.map((u) => (
              <StaggerItem key={u.title}>
                <Card className="card-lift h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-orange/10 text-orange flex items-center justify-center mb-4 mx-auto">
                      <u.icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-foreground">{u.title}</h3>
                    <p className="text-sm text-muted-foreground">{u.desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <NeighborhoodPrices variant="koop" />

      {/* Wat doen wij voor jou */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12">
              Wat doen wij voor jou?
            </h2>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4" stagger={0.05}>
            {services.map((s) => (
              <StaggerItem key={s}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-myrtle shrink-0 mt-0.5" />
                  <span className="text-foreground">{s}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Questionnaire teaser */}
      <section className="py-12 md:py-16 bg-mintcream/30">
        <Reveal className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-mintcream/60 border-myrtle/30 card-lift">
            <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="shrink-0 w-14 h-14 rounded-full bg-myrtle/10 text-myrtle flex items-center justify-center">
                <ClipboardList className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">
                  7 vragen, 2 minuten
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ontvang binnen 24u een persoonlijk gesprek.
                </p>
              </div>
              <Button asChild size="lg" className="bg-orange hover:bg-orange/90 text-white w-full sm:w-auto btn-pop">
                <Link to="/koop/lead">Start intake-formulier</Link>
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 md:py-24 bg-white">
        <Reveal className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">Direct contact</h2>
          <p className="text-muted-foreground mb-8">Spreek direct met je aankoopmakelaar.</p>
          <Card className="text-left card-lift">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-start gap-4 mb-6">
                <a href={telHref} className="text-3xl font-bold text-myrtle hover:underline">
                  {contacts.phone}
                </a>
                <div className="flex items-center gap-3">
                  <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-myrtle text-myrtle hover:bg-myrtle/10 transition-colors btn-pop" aria-label="WhatsApp">
                    <MessageCircle className="w-5 h-5" />
                  </a>
                  <a href={`mailto:${contacts.email}`} className="text-foreground hover:text-myrtle">
                    {contacts.email}
                  </a>
                </div>
              </div>
              <Button asChild size="lg" className="w-full bg-orange hover:bg-orange/90 text-white btn-pop">
                <Link to="/koop/lead">Vul intake-formulier in</Link>
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
};

export default Koop;
