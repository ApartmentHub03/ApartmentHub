import { useServiceContacts } from '@/hooks/useServiceContacts';
import { useCity } from '@/contexts/CityContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Phone, Mail, Camera, Handshake, FileSignature, Megaphone, Sparkles, BarChart3, MessageCircle, Home, ClipboardList, Wrench, Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ExpandableStepCard } from '@/components/motion/ExpandableStepCard';
import ReviewsBadge from '@/components/landing/ReviewsBadge';
import QuickContactStrip from '@/components/landing/QuickContactStrip';
import PricingCallout from '@/components/landing/PricingCallout';
import NeighborhoodPrices from '@/components/NeighborhoodPrices';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/Reveal';


const cityLabel = (c: string | null) => (c === 'utrecht' ? 'Midden Nederland' : 'Amsterdam');

const steps = [
  { icon: Home, title: '1. Kennismaking en waardebepaling', desc: 'We bezoeken je woning, bespreken je wensen en bepalen samen een realistische vraagprijs op basis van marktdata, vergelijkbare verkopen en de staat van je woning.', detail: 'Tijdens een vrijblijvend bezoek bekijken we je woning en bespreken we je situatie en wensen. We analyseren recente verkopen in jouw buurt, de huidige vraag en het aanbod, en de unieke kenmerken van je woning. Op basis daarvan adviseren we een realistische en strategische vraagprijs.' },
  { icon: ClipboardList, title: '2. Verkoopstrategie op maat', desc: 'We stellen een strategisch verkoopplan op: doelgroep, timing, biedmethode en positionering. Je krijgt dit plan op papier zodat je precies weet wat we doen.', detail: 'Geen woning is hetzelfde, dus geen verkoop ook. We bepalen samen de doelgroep, de beste timing en de biedmethode die bij jouw woning past. Je ontvangt een helder verkoopplan op papier met planning, aanpak en verwachte doorlooptijd.' },
  { icon: Wrench, title: '3. Woning verkoopklaar maken', desc: 'Advies over kleine ingrepen die het meeste opleveren: styling, opruimen, klein herstel. Waar nodig schakelen we een stylist in.', detail: 'De eerste indruk bepaalt vaak de prijs. We geven gericht advies over wat het meeste oplevert: opruimen, kleine reparaties, neutraliseren en styling. Waar het loont schakelen we een stylist of klusservice in.' },
  { icon: Camera, title: '4. Professionele fotografie en presentatie', desc: 'Een vakfotograaf maakt lichte, ruimtelijke fotos. We laten een plattegrond tekenen, eventueel video of drone-opnames, en schrijven een wervende verkooptekst.', detail: 'Een vakfotograaf legt je woning op zijn mooist vast met licht, ruimte en sfeer. We laten een plattegrond tekenen, maken waar gewenst video of drone-opnames, en schrijven een wervende verkooptekst.' },
  { icon: Megaphone, title: '5. Publicatie en marketing', desc: 'Je woning gaat live op Funda, onze eigen kanalen en sociale media. We benaderen actief ons netwerk van kopers en aankoopmakelaars, ook off-market.', detail: 'Je woning gaat live op Funda en op onze eigen kanalen en sociale media. We zetten gerichte advertenties in en benaderen actief ons netwerk van kopers en aankoopmakelaars, ook voor stille verkoop.' },
  { icon: Users, title: '6. Bezichtigingen en onderhandeling', desc: 'Wij plannen en begeleiden alle bezichtigingen, verzamelen feedback en onderhandelen namens jou tot het beste resultaat.', detail: 'Wij plannen en begeleiden alle bezichtigingen persoonlijk en verzamelen concrete feedback. Bij interesse onderhandelen we namens jou op prijs en voorwaarden, met een heldere strategie.' },
  { icon: FileSignature, title: '7. Koopovereenkomst en overdracht', desc: 'We stellen de koopovereenkomst op of controleren deze, begeleiden de ontbindende voorwaarden en staan naast je tot de sleuteloverdracht bij de notaris.', detail: 'We stellen de koopovereenkomst op of controleren deze zorgvuldig, bewaken de ontbindende voorwaarden en termijnen, en houden contact met de notaris tot en met de sleuteloverdracht.' },
];

const benefits = [
  { icon: Megaphone, title: 'Funda + eigen kanalen', desc: 'Brede zichtbaarheid op Funda én via ons eigen huurder/koper netwerk.' },
  { icon: Sparkles, title: 'Persoonlijke begeleiding', desc: 'Eén vast aanspreekpunt door het hele verkoopproces.' },
  { icon: BarChart3, title: 'Marktdata & taxatie', desc: 'Onderbouwde vraagprijs op basis van actuele marktdata.' },
];


const Verkoop = () => {
  const { city } = useCity();
  const contacts = useServiceContacts('verkoop');
  const cityName = cityLabel(city);

  const scrollToValuation = () => {
    document.getElementById('waardebepaling')?.scrollIntoView({ behavior: 'smooth' });
  };

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
            Verkoop je woning in {cityName}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            Persoonlijke verkoopbegeleiding. 1% courtage exclusief BTW, no cure no pay. Off-market exposure waar het kan.
          </p>
          <div className="flex justify-center mb-6">
            <ReviewsBadge />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-orange hover:bg-orange/90 text-white btn-pop">
              <Link to="/waardebepaling">Bereken je verkoopwaarde</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-myrtle text-myrtle hover:bg-myrtle/10 btn-pop">
              <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-myrtle text-myrtle hover:bg-myrtle/10 btn-pop">
              <a href={`tel:${contacts.phone.replace(/\s/g, '')}`}>
                <Phone className="w-4 h-4" /> Bel ons
              </a>
            </Button>
          </div>
          <QuickContactStrip />
        </motion.div>
      </section>

      {/* Waardebepaling - prominent, bovenaan */}
      <section id="waardebepaling" className="py-12 md:py-16 bg-gradient-to-br from-myrtle/10 to-orange/10">
        <Reveal className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">Wat is jouw woning waard?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Vul je adres in en wij halen automatisch het bouwjaar en de oppervlakte op uit het Kadaster, tonen je woning op de kaart en berekenen een onderbouwde waarde-indicatie. In 2 minuten, gratis en vrijblijvend.
          </p>
          <Button asChild size="lg" className="bg-orange hover:bg-orange/90 text-white btn-pop">
            <Link to="/waardebepaling">Start je gratis waardebepaling</Link>
          </Button>
        </Reveal>
      </section>

      {/* Pricing callout */}
      <PricingCallout />

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-4">Hoe werkt het?</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
              Verkopen is meer dan een bordje in de tuin. Dit is hoe wij het aanpakken, van eerste gesprek tot sleuteloverdracht.
            </p>
          </Reveal>
          <StaggerGroup className="orphan-grid-3">
            {steps.map((s) => (
              <StaggerItem key={s.title}>
                <ExpandableStepCard icon={s.icon} title={s.title} desc={s.desc} detail={s.detail} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24 bg-mintcream/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-12">Wat krijg je van ons</h2>
          </Reveal>
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <StaggerItem key={b.title}>
                <Card className="card-lift h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-orange/10 text-orange flex items-center justify-center mb-4 mx-auto">
                      <b.icon className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-foreground">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <NeighborhoodPrices variant="verkoop" />

      {/* Contact */}
      <section id="contact" className="py-16 md:py-24 bg-white">
        <Reveal className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">Direct contact</h2>
          <p className="text-muted-foreground mb-8">Spreek direct met je verkoopmakelaar in {cityName}.</p>
          <Card className="text-left card-lift">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-3 mb-6">
                <a href={`tel:${contacts.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-foreground hover:text-myrtle">
                  <Phone className="w-5 h-5 text-myrtle" /> {contacts.phone}
                </a>
                <a href={`mailto:${contacts.email}`} className="flex items-center gap-3 text-foreground hover:text-myrtle">
                  <Mail className="w-5 h-5 text-myrtle" /> {contacts.email}
                </a>
                <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-foreground hover:text-myrtle">
                  <MessageCircle className="w-5 h-5 text-myrtle" /> WhatsApp
                </a>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="flex-1 bg-orange hover:bg-orange/90 text-white btn-pop" onClick={scrollToValuation}>
                  Bereken je verkoopwaarde
                </Button>
                <Button asChild size="lg" variant="outline" className="flex-1 border-myrtle text-myrtle hover:bg-myrtle/10 btn-pop">
                  <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="flex-1 border-myrtle text-myrtle hover:bg-myrtle/10 btn-pop">
                  <a href={`tel:${contacts.phone.replace(/\s/g, '')}`}>
                    <Phone className="w-4 h-4" /> Bel ons
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
};

export default Verkoop;
