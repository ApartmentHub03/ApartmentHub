import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useCity } from '@/contexts/CityContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Phone, ArrowLeft, Loader2, Search, MapPin, CheckCircle2, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateValuation, formatEUR, NEIGHBORHOOD_PRICES, DEFAULT_PRICE, TYPE_OPTIONS,
  BOUWPERIODE_OPTIONS, STAAT_OPTIONS, ENERGIE_OPTIONS, BUITEN_OPTIONS, SOUTERRAIN_OPTIONS,
  bouwjaarToBouwperiode, type City, type ValuationResult,
} from '@/lib/valuation';
import { lookupBag, osmEmbedUrl, type BagResult } from '@/lib/bag';
import SEO from '@/components/SEO';

interface Step1Data {
  adres: string; postcode: string; city: City; wijk: string;
  oppervlakte: string; type: string; bouwperiode: string;
  staat: string; energielabel: string; buitenruimte: string;
  parkeren: string; souterrain: string;
}
interface Step2Data {
  voornaam: string; achternaam: string; email: string;
  telefoon: string; akkoord: boolean;
}

const initialStep1 = (city: City): Step1Data => ({
  adres: '', postcode: '', city, wijk: '', oppervlakte: '',
  type: '', bouwperiode: '', staat: '', energielabel: '',
  buitenruimte: '', parkeren: '', souterrain: '',
});
const initialStep2: Step2Data = {
  voornaam: '', achternaam: '', email: '',
  telefoon: '+31 ', akkoord: false,
};

const DAVID_TEL = '+31683221189';

const UTRECHT_PLAATSEN = /utrecht|amersfoort|nieuwegein|zeist|houten|ijsselstein|vleuten|bilthoven|de bilt|maarssen|bunnik|vianen/i;
const AMSTERDAM_PLAATSEN = /amsterdam|amstelveen|diemen|duivendrecht/i;

const Waardebepaling = () => {
  const { city: ctxCity } = useCity();
  const defaultCity: City = ctxCity ?? 'amsterdam';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [s1, setS1] = useState<Step1Data>(initialStep1(defaultCity));
  const [s2, setS2] = useState<Step2Data>(initialStep2);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bag, setBag] = useState<BagResult | null>(null);
  const [bagLoading, setBagLoading] = useState(false);
  const [bagDone, setBagDone] = useState(false);

  const wijkOptions = useMemo(() => Object.keys(NEIGHBORHOOD_PRICES[s1.city]), [s1.city]);

  const marktwaarde = useMemo(
    () => NEIGHBORHOOD_PRICES[s1.city]?.[s1.wijk] ?? DEFAULT_PRICE[s1.city],
    [s1.city, s1.wijk],
  );

  const validStep1 = () => !!s1.adres && !!s1.wijk;
  const validStep2 = () =>
    Number(s1.oppervlakte) > 0 && !!s1.type && !!s1.bouwperiode && !!s1.staat &&
    !!s1.energielabel && !!s1.buitenruimte && !!s1.parkeren && !!s1.souterrain;
  const validStep3 = () =>
    !!s2.voornaam && !!s2.achternaam && /\S+@\S+\.\S+/.test(s2.email) &&
    s2.telefoon.replace(/\D/g, '').length >= 9 && s2.akkoord;

  const zoekWoning = async () => {
    if (!s1.adres.trim()) return;
    setBagLoading(true);
    setBagDone(false);
    try {
      const q = [s1.adres, s1.postcode].filter(Boolean).join(' ');
      const res = await lookupBag(q);
      setBag(res);
      setBagDone(true);
      if (res.found) {
        setS1((prev) => {
          const next = { ...prev };
          if (res.oppervlakte && !prev.oppervlakte) next.oppervlakte = String(res.oppervlakte);
          if (res.bouwjaar && !prev.bouwperiode) next.bouwperiode = bouwjaarToBouwperiode(res.bouwjaar);
          const wp = res.woonplaats ?? res.weergavenaam ?? '';
          if (AMSTERDAM_PLAATSEN.test(wp)) next.city = 'amsterdam';
          else if (UTRECHT_PLAATSEN.test(wp)) next.city = 'utrecht';
          return next;
        });
      }
    } catch {
      setBag({ found: false });
      setBagDone(true);
    } finally {
      setBagLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!validStep3()) {
      toast.error('Vul alle verplichte velden in.');
      return;
    }
    setSubmitting(true);
    const calc = calculateValuation({
      city: s1.city,
      wijk: s1.wijk,
      oppervlakte: Number(s1.oppervlakte),
      bouwperiode: s1.bouwperiode,
      staat: s1.staat,
      energielabel: s1.energielabel,
      buitenruimte: s1.buitenruimte,
      parkeren: s1.parkeren,
      souterrain: s1.souterrain,
    });
    const stadLabel = s1.city === 'utrecht' ? 'Midden Nederland' : 'Amsterdam';
    try {
      const { error } = await supabase.from('valuation_leads').insert({
        address: s1.adres,
        postcode: s1.postcode,
        city: stadLabel,
        neighborhood: s1.wijk,
        surface_area: Number(s1.oppervlakte),
        property_type: s1.type,
        construction_period: s1.bouwperiode,
        condition: s1.staat,
        energy_label: s1.energielabel,
        outdoor_space: s1.buitenruimte,
        parking: s1.parkeren,
        first_name: s2.voornaam,
        last_name: s2.achternaam,
        email: s2.email,
        phone: s2.telefoon,
        estimated_value_low: calc.laag,
        estimated_value_high: calc.hoog,
      });
      if (error) throw error;

      // Resultaat per mail (best effort, blokkeert de flow niet).
      try {
        const summaryHtml =
          `<div style="background:#f4f4f4;padding:16px;border-radius:8px;margin:16px 0;">
             <p style="margin:0 0 8px;"><strong>Adres:</strong> ${s1.adres}, ${s1.postcode} (${s1.wijk})</p>
             <p style="margin:0;font-size:20px;color:#009B8A;"><strong>${formatEUR(calc.laag)} tot ${formatEUR(calc.hoog)}</strong></p>
           </div>`;
        const leadDetailsHtml =
          `<p><strong>${s2.voornaam} ${s2.achternaam}</strong><br/>${s2.email} · ${s2.telefoon}</p>
           <p>${stadLabel} · ${s1.wijk} · ${s1.oppervlakte} m² · ${s1.type}<br/>
           ${s1.bouwperiode} · ${s1.staat} · energielabel ${s1.energielabel}<br/>
           ${s1.buitenruimte} · parkeren: ${s1.parkeren} · ${s1.souterrain}</p>`;
        await supabase.functions.invoke('send-lead-confirmation', {
          body: {
            type: 'waardebepaling',
            recipientEmail: s2.email,
            recipientName: s2.voornaam,
            summaryHtml,
            leadDetailsHtml,
          },
        });
      } catch (mailErr) {
        console.warn('send-lead-confirmation failed (non-blocking):', mailErr);
      }

      setResult(calc);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      toast.error('Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = result ? 100 : step === 1 ? 33 : step === 2 ? 66 : 90;

  return (
    <div className="min-h-screen bg-gradient-to-br from-mintcream/40 to-background py-10 md:py-16">
      <SEO
        path="/waardebepaling"
        title="Wat is mijn woning waard? · Gratis waardebepaling · ApartmentHub"
        description="Ontvang in 2 minuten een onderbouwde waarde-indicatie van je woning. Adres invullen, wij halen bouwjaar en oppervlakte automatisch op uit het BAG."
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <Link to="/verkoop" className="inline-flex items-center text-sm text-myrtle hover:underline mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar verkoop
          </Link>
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-myrtle/10 text-myrtle mb-3">
            <Home className="w-3.5 h-3.5" /> Gratis en vrijblijvend
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Wat is jouw woning waard?</h1>
          <p className="text-muted-foreground mb-4">
            Vul je adres in en wij halen automatisch het bouwjaar en de oppervlakte op uit het Kadaster (BAG).
            In 2 minuten een onderbouwde waarde-indicatie.
          </p>
          {!result && (
            <>
              <p className="text-sm text-muted-foreground mb-2">Stap {step} van 3</p>
              <Progress value={progress} className="h-2" />
            </>
          )}
        </div>

        <Card className="card-lift">
          <CardContent className="p-6 md:p-8">
            <AnimatePresence mode="wait">

            {!result && step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-4">
                <h2 className="text-xl font-semibold">Waar staat je woning?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Field label="Adres en huisnummer">
                      <Input value={s1.adres} onChange={(e) => setS1({ ...s1, adres: e.target.value })} placeholder="Voorbeeldstraat 12" />
                    </Field>
                  </div>
                  <Field label="Postcode">
                    <Input value={s1.postcode} onChange={(e) => setS1({ ...s1, postcode: e.target.value })} placeholder="1011 AB" />
                  </Field>
                </div>

                <Button type="button" variant="outline" className="w-full btn-pop" onClick={zoekWoning} disabled={!s1.adres.trim() || bagLoading}>
                  {bagLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Zoek mijn woning
                </Button>

                {bagDone && bag?.found && (
                  <div className="rounded-lg border border-myrtle/30 bg-myrtle/5 overflow-hidden">
                    {bag.lat != null && bag.lon != null && (
                      <iframe
                        title="Locatie van de woning"
                        loading="lazy"
                        src={osmEmbedUrl(bag.lat, bag.lon)}
                        className="w-full h-56 border-0"
                      />
                    )}
                    <div className="p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-myrtle mb-2">
                        <CheckCircle2 className="w-4 h-4" /> {bag.weergavenaam}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {bag.bouwjaar && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white border">Bouwjaar {bag.bouwjaar}</span>
                        )}
                        {bag.oppervlakte && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white border">{bag.oppervlakte} m² (BAG)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Bron: Kadaster BAG. Klopt iets niet? Je kunt het in de volgende stap aanpassen.</p>
                    </div>
                  </div>
                )}
                {bagDone && bag && !bag.found && (
                  <p className="text-xs text-muted-foreground">We konden dit adres niet automatisch vinden. Geen probleem, je vult de gegevens in de volgende stap zelf in.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Stad / regio">
                    <Select value={s1.city} onValueChange={(v: City) => setS1({ ...s1, city: v, wijk: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amsterdam">Amsterdam</SelectItem>
                        <SelectItem value="utrecht">Midden Nederland</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Wijk">
                    <Select value={s1.wijk} onValueChange={(v) => setS1({ ...s1, wijk: v })}>
                      <SelectTrigger><SelectValue placeholder="Kies een wijk" /></SelectTrigger>
                      <SelectContent>
                        {wijkOptions.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {s1.wijk && (
                  <div className="flex items-center gap-2 text-sm rounded-lg bg-muted/40 px-3 py-2">
                    <MapPin className="w-4 h-4 text-orange" />
                    <span>Gemiddeld in <strong>{s1.wijk}</strong>: <strong>{formatEUR(marktwaarde)}</strong> per m²</span>
                  </div>
                )}

                <Button className="w-full bg-orange hover:bg-orange/90 text-white mt-2 btn-pop" size="lg" disabled={!validStep1()} onClick={() => setStep(2)}>
                  Volgende
                </Button>
              </motion.div>
            )}

            {!result && step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-4">
                <h2 className="text-xl font-semibold">Vertel ons meer over je woning</h2>
                <p className="text-sm text-muted-foreground">Hoe meer je invult, hoe preciezer de indicatie.</p>

                <Field label="Woonoppervlakte (m²)">
                  <Input type="number" min={1} value={s1.oppervlakte} onChange={(e) => setS1({ ...s1, oppervlakte: e.target.value })} placeholder="85" />
                </Field>

                <DropField label="Type woning" value={s1.type} options={[...TYPE_OPTIONS]} onChange={(v) => setS1({ ...s1, type: v })} />
                <DropField label="Bouwperiode" value={s1.bouwperiode} options={[...BOUWPERIODE_OPTIONS]} onChange={(v) => setS1({ ...s1, bouwperiode: v })} />
                <DropField label="Staat van de woning" value={s1.staat} options={[...STAAT_OPTIONS]} onChange={(v) => setS1({ ...s1, staat: v })} />
                <DropField label="Energielabel" value={s1.energielabel} options={[...ENERGIE_OPTIONS]} onChange={(v) => setS1({ ...s1, energielabel: v })} />
                <DropField label="Buitenruimte" value={s1.buitenruimte} options={[...BUITEN_OPTIONS]} onChange={(v) => setS1({ ...s1, buitenruimte: v })} />
                <DropField label="Souterrain" value={s1.souterrain} options={[...SOUTERRAIN_OPTIONS]} onChange={(v) => setS1({ ...s1, souterrain: v })} />
                <DropField label="Eigen parkeerplek" value={s1.parkeren} options={['Ja', 'Nee']} onChange={(v) => setS1({ ...s1, parkeren: v })} />

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 btn-pop" onClick={() => setStep(1)}>Vorige</Button>
                  <Button className="flex-1 bg-orange hover:bg-orange/90 text-white btn-pop" disabled={!validStep2()} onClick={() => setStep(3)}>Volgende</Button>
                </div>
              </motion.div>
            )}

            {!result && step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-4">
                <h2 className="text-xl font-semibold">Waar mogen we je waardebepaling naartoe sturen?</h2>
                <p className="text-sm text-muted-foreground">Je ontvangt de indicatie per e-mail en wij nemen persoonlijk contact met je op.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Voornaam">
                    <Input value={s2.voornaam} onChange={(e) => setS2({ ...s2, voornaam: e.target.value })} />
                  </Field>
                  <Field label="Achternaam">
                    <Input value={s2.achternaam} onChange={(e) => setS2({ ...s2, achternaam: e.target.value })} />
                  </Field>
                </div>
                <Field label="Emailadres">
                  <Input type="email" value={s2.email} onChange={(e) => setS2({ ...s2, email: e.target.value })} />
                </Field>
                <Field label="Telefoonnummer">
                  <Input value={s2.telefoon} onChange={(e) => setS2({ ...s2, telefoon: e.target.value })} placeholder="+31 6 12345678" />
                </Field>

                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={s2.akkoord} onCheckedChange={(v) => setS2({ ...s2, akkoord: !!v })} />
                  <span>
                    Ik ga akkoord met de{' '}
                    <Link to="/algemene-voorwaarden" className="text-myrtle underline">algemene voorwaarden</Link>{' '}
                    en{' '}
                    <Link to="/privacyverklaring" className="text-myrtle underline">privacyverklaring</Link>.
                  </span>
                </label>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 btn-pop" onClick={() => setStep(2)}>Vorige</Button>
                  <Button className="flex-1 bg-orange hover:bg-orange/90 text-white btn-pop" disabled={!validStep3() || submitting} onClick={onSubmit}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Bekijk mijn waardebepaling
                  </Button>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Geschatte marktwaarde van</p>
                  <p className="font-medium">{s1.adres}{s1.postcode ? `, ${s1.postcode}` : ''}</p>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-orange leading-tight">
                  {formatEUR(result.laag)} tot {formatEUR(result.hoog)}
                </p>

                <div className="border rounded-lg p-4 bg-muted/30 text-left">
                  <p className="text-sm font-medium mb-2">Onderbouwing</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Basiswaarde: {formatEUR(result.basiswaarde)}{' '}
                    <span className="text-xs">({formatEUR(result.pricePerM2)}/m² × {s1.oppervlakte} m²)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['Wijk', s1.wijk],
                      ['Bouwperiode', s1.bouwperiode],
                      ['Staat', s1.staat],
                      ['Energielabel', s1.energielabel],
                      ['Buitenruimte', s1.buitenruimte],
                      ['Souterrain', s1.souterrain],
                      ['Parkeren', s1.parkeren],
                    ].map(([k, v]) => (
                      <span key={k} className="text-xs px-2 py-1 rounded-full bg-myrtle/10 text-myrtle">{k}: {v}</span>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  We hebben de indicatie naar <strong>{s2.email}</strong> gestuurd en nemen binnenkort contact met je op.
                </p>
                <p className="text-xs text-muted-foreground">
                  Dit is een geautomatiseerde indicatie op basis van marktdata en het BAG, geen taxatie. Voor een exacte waardebepaling komen we graag langs.
                </p>

                <Button asChild size="lg" className="w-full bg-orange hover:bg-orange/90 text-white btn-pop">
                  <a href={`tel:${DAVID_TEL}`}>
                    <Phone className="w-4 h-4 mr-2" /> Plan een gratis waardebepaling op locatie
                  </a>
                </Button>
              </motion.div>
            )}

            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-sm mb-1 block">{label}</Label>
    {children}
  </div>
);

const DropField = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <Field label={label}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Kies een optie" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  </Field>
);

export default Waardebepaling;
