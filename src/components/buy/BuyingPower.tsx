import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, XCircle, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

import { useCity } from '@/contexts/CityContext';
import { supabase } from '@/integrations/supabase/client';
import { NEIGHBORHOOD_PRICES, formatEUR, type City } from '@/lib/valuation';
import SEO from '@/components/SEO';
import { Reveal } from '@/components/motion/Reveal';
import { cn } from '@/lib/utils';

const DAVID_TEL = '+31641439378';

const BUDGET_BANDS: { label: string; value: string; koopkracht: number }[] = [
  { label: 'Tot EUR 500.000', value: 'tot-500k', koopkracht: 500_000 },
  { label: 'EUR 500.000 tot 750.000', value: '500-750k', koopkracht: 750_000 },
  { label: 'EUR 750.000 tot 1.000.000', value: '750k-1m', koopkracht: 1_000_000 },
  { label: 'EUR 1.000.000 tot 1.500.000', value: '1-1.5m', koopkracht: 1_500_000 },
  { label: 'EUR 1.500.000+', value: '1.5m+', koopkracht: 1_750_000 },
];

const BEDROOM_OPTIONS = ['1', '2', '3', '4+'];
const BEDROOM_MIN_M2: Record<string, number> = { '1': 45, '2': 65, '3': 85, '4+': 110 };

interface Step1 {
  budgetBand: string;
  city: City;
  wijken: string[];
  minM2: string;
  minSlaapkamers: string;
}
interface Step2 {
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string;
  akkoord: boolean;
}

const initialStep1 = (city: City): Step1 => ({
  budgetBand: '',
  city,
  wijken: [],
  minM2: '',
  minSlaapkamers: '',
});
const initialStep2: Step2 = {
  voornaam: '',
  achternaam: '',
  email: '',
  telefoon: '+31 ',
  akkoord: false,
};

type Verdict = 'green' | 'orange' | 'red';
interface WijkResult {
  wijk: string;
  pricePerM2: number;
  haalbareM2: number;
  verdict: Verdict;
  message: string;
}

const Koopkracht = () => {
  const { city: ctxCity } = useCity();
  const defaultCity: City = ctxCity ?? 'amsterdam';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [s1, setS1] = useState<Step1>(initialStep1(defaultCity));
  const [s2, setS2] = useState<Step2>(initialStep2);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<WijkResult[]>([]);
  const [suggestions, setSuggestions] = useState<WijkResult[]>([]);

  const wijkOptions = useMemo(
    () => Object.entries(NEIGHBORHOOD_PRICES[s1.city]),
    [s1.city]
  );

  const koopkracht = BUDGET_BANDS.find((b) => b.value === s1.budgetBand)?.koopkracht ?? 0;
  const minM2Num = Number(s1.minM2) || 0;

  const validStep1 = () =>
    !!s1.budgetBand && s1.wijken.length > 0 && minM2Num > 0 && !!s1.minSlaapkamers;
  const validStep2 = () =>
    s2.voornaam && s2.achternaam && /\S+@\S+\.\S+/.test(s2.email) &&
    s2.telefoon.replace(/\D/g, '').length >= 9 && s2.akkoord;

  const toggleWijk = (w: string) => {
    setS1((prev) => ({
      ...prev,
      wijken: prev.wijken.includes(w)
        ? prev.wijken.filter((x) => x !== w)
        : [...prev.wijken, w],
    }));
  };

  const computeResults = (): { selected: WijkResult[]; suggestions: WijkResult[] } => {
    const prices = NEIGHBORHOOD_PRICES[s1.city];
    const requiredM2 = Math.max(minM2Num, BEDROOM_MIN_M2[s1.minSlaapkamers] ?? 0);
    const selected: WijkResult[] = s1.wijken.map((w) => {
      const p = prices[w];
      const haalbareM2 = Math.round(koopkracht / p);
      let verdict: Verdict;
      let message: string;
      if (haalbareM2 >= requiredM2) {
        verdict = 'green';
        message = `In ${w} koop je met dit budget ca. ${haalbareM2} m2 · ruim genoeg voor ${s1.minSlaapkamers} slaapkamer(s).`;
      } else if (haalbareM2 >= requiredM2 * 0.9) {
        verdict = 'orange';
        message = `In ${w} koop je ca. ${haalbareM2} m2 · krap voor ${s1.minSlaapkamers} slaapkamer(s) (richtlijn ~${requiredM2} m2). Haalbaar met scherp bieden of iets inleveren.`;
      } else {
        verdict = 'red';
        message = `Niet haalbaar: in ${w} koop je met dit budget ca. ${haalbareM2} m2, maar ${s1.minSlaapkamers} slaapkamer(s) vraagt minimaal ~${requiredM2} m2. Kies een hoger budget of een voordeligere wijk.`;
      }
      return { wijk: w, pricePerM2: p, haalbareM2, verdict, message };
    });

    const anyFits = selected.some((r) => r.verdict === 'green');
    let suggestions: WijkResult[] = [];
    if (!anyFits) {
      suggestions = Object.entries(prices)
        .filter(([w]) => !s1.wijken.includes(w))
        .map(([w, p]) => {
          const haalbareM2 = Math.round(koopkracht / p);
          return {
            wijk: w,
            pricePerM2: p,
            haalbareM2,
            verdict: 'green' as Verdict,
            message: `In ${w} haal je ca. ${haalbareM2} m2 met jouw budget.`,
          };
        })
        .filter((r) => r.haalbareM2 >= requiredM2)
        .sort((a, b) => a.pricePerM2 - b.pricePerM2)
        .slice(0, 3);
    }
    return { selected, suggestions };
  };

  const onSubmitStep2 = async () => {
    if (!validStep2()) {
      toast.error('Vul alle verplichte velden in.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('koopkracht_leads').insert({
        stad: s1.city === 'utrecht' ? 'Midden Nederland' : 'Amsterdam',
        wijken: s1.wijken,
        budget_band: BUDGET_BANDS.find((b) => b.value === s1.budgetBand)?.label ?? s1.budgetBand,
        koopkracht,
        min_m2: minM2Num,
        min_slaapkamers: s1.minSlaapkamers,
        voornaam: s2.voornaam,
        achternaam: s2.achternaam,
        email: s2.email,
        telefoon: s2.telefoon,
      });
      if (error) throw error;
      const r = computeResults();
      setResults(r.selected);
      setSuggestions(r.suggestions);
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error('Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-10 md:py-16">
      <SEO
        path="/koopkracht"
        title="Wat kan ik kopen? — ApartmentHub"
        description="Bereken in 2 minuten welke woning haalbaar is binnen jouw budget en gewenste wijk."
      />
      <Reveal className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <Link to="/koop" className="inline-flex items-center text-sm text-myrtle hover:underline mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar koop
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Wat kan ik kopen?</h1>
          <p className="text-sm text-muted-foreground mb-4">Stap {step} van 3</p>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="card-lift">
          <CardContent className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Jouw zoekwensen</h2>
                    <p className="text-sm text-muted-foreground">Vertel ons wat je zoekt, dan rekenen wij uit wat haalbaar is.</p>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">Aankoopbudget k.k.</Label>
                    <div className="flex flex-wrap gap-2">
                      {BUDGET_BANDS.map((b) => (
                        <button
                          key={b.value}
                          type="button"
                          onClick={() => setS1({ ...s1, budgetBand: b.value })}
                          className={cn(
                            'px-3 py-2 rounded-full border text-sm transition-colors btn-pop',
                            s1.budgetBand === b.value
                              ? 'bg-orange text-white border-orange'
                              : 'bg-background border-myrtle/30 text-foreground hover:border-orange'
                          )}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">Stad / regio</Label>
                    <div className="flex gap-2">
                      {([
                        ['amsterdam', 'Amsterdam'],
                        ['utrecht', 'Midden Nederland'],
                      ] as [City, string][]).map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setS1({ ...s1, city: v, wijken: [] })}
                          className={cn(
                            'flex-1 px-3 py-2 rounded-md border text-sm transition-colors btn-pop',
                            s1.city === v
                              ? 'bg-myrtle text-white border-myrtle'
                              : 'bg-background border-myrtle/30 text-foreground hover:border-myrtle'
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">Gewenste wijk(en)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {wijkOptions.map(([w, p]) => {
                        const selected = s1.wijken.includes(w);
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => toggleWijk(w)}
                            className={cn(
                              'rounded-lg border p-3 text-left transition-all btn-pop',
                              selected
                                ? 'bg-myrtle/10 border-myrtle ring-2 ring-myrtle/30'
                                : 'bg-background border-myrtle/20 hover:border-myrtle'
                            )}
                          >
                            <div className="text-sm font-semibold text-foreground">{w}</div>
                            <div className="text-xs text-muted-foreground">{formatEUR(p)}/m²</div>
                          </button>
                        );
                      })}
                    </div>
                    {s1.wijken.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">{s1.wijken.length} wijk(en) geselecteerd</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm mb-1 block">Minimum woonoppervlakte (m²)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={s1.minM2}
                      onChange={(e) => setS1({ ...s1, minM2: e.target.value })}
                      placeholder="75"
                    />
                  </div>

                  <div>
                    <Label className="text-sm mb-2 block">Minimum aantal slaapkamers</Label>
                    <div className="flex gap-2">
                      {BEDROOM_OPTIONS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setS1({ ...s1, minSlaapkamers: b })}
                          className={cn(
                            'flex-1 px-3 py-2 rounded-md border text-sm transition-colors btn-pop',
                            s1.minSlaapkamers === b
                              ? 'bg-orange text-white border-orange'
                              : 'bg-background border-myrtle/30 text-foreground hover:border-orange'
                          )}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-orange hover:bg-orange/90 text-white mt-2 btn-pop"
                    size="lg"
                    disabled={!validStep1()}
                    onClick={() => setStep(2)}
                  >
                    Volgende stap
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">Waar mogen we je resultaat naartoe sturen?</h2>
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
                    <Button variant="outline" className="flex-1 btn-pop" onClick={() => setStep(1)}>Vorige</Button>
                    <Button
                      className="flex-1 bg-orange hover:bg-orange/90 text-white btn-pop"
                      disabled={!validStep2() || submitting}
                      onClick={onSubmitStep2}
                    >
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Bekijk mijn resultaat
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold">Jouw koopkracht in beeld</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Budget: <span className="font-semibold text-foreground">{formatEUR(koopkracht)}</span> k.k. · minimaal {minM2Num} m² · {s1.minSlaapkamers} slaapkamer(s)
                    </p>
                  </div>

                  {results.every((r) => r.verdict !== 'green') && suggestions.length === 0 && (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4 flex gap-3">
                      <XCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                      <p className="text-sm font-semibold text-red-800">
                        Met dit budget en {s1.minSlaapkamers} slaapkamer(s) is in {s1.city === 'utrecht' ? 'Midden Nederland' : 'Amsterdam'} geen enkele wijk haalbaar. Overweeg minder slaapkamers, een hoger budget, of de andere regio.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {results.map((r) => (
                      <ResultCard key={r.wijk} r={r} />
                    ))}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="border rounded-lg p-4 bg-myrtle/5 border-myrtle/20">
                      <p className="text-sm font-semibold text-myrtle mb-2">
                        Geen van je geselecteerde wijken past helemaal. Kijk ook eens naar:
                      </p>
                      <ul className="space-y-2">
                        {suggestions.map((s) => (
                          <li key={s.wijk} className="text-sm text-foreground">
                            <span className="font-semibold">{s.wijk}</span> — ca. {s.haalbareM2} m² haalbaar ({formatEUR(s.pricePerM2)}/m²)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    Indicatieve berekening op basis van gemiddelde wijkprijzen, geen garantie.
                  </p>

                  <div className="space-y-2">
                    <Button asChild size="lg" className="w-full bg-orange hover:bg-orange/90 text-white btn-pop">
                      <a href={`tel:${DAVID_TEL}`}>
                        <Phone className="w-4 h-4 mr-2" /> Bel direct met onze aankoopmakelaar
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full btn-pop">
                      <Link to="/koop/lead">
                        <ClipboardList className="w-4 h-4 mr-2" /> Vul het volledige intakeformulier in
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-sm mb-1 block">{label}</Label>
    {children}
  </div>
);

const ResultCard = ({ r }: { r: WijkResult }) => {
  const styles = {
    green: { bg: 'bg-green-50 border-green-300', text: 'text-green-800', icon: CheckCircle2, badge: 'Haalbaar', badgeBg: 'bg-green-600' },
    orange: { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-800', icon: AlertTriangle, badge: 'Krap', badgeBg: 'bg-orange' },
    red: { bg: 'bg-red-100 border-red-400', text: 'text-red-900', icon: XCircle, badge: 'Niet haalbaar', badgeBg: 'bg-red-700' },
  }[r.verdict];
  const Icon = styles.icon;
  return (
    <div className={cn('border-2 rounded-lg p-4 flex gap-3', styles.bg)}>
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', styles.text)} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-foreground">{r.wijk}</span>
          <span className={cn('text-xs text-white px-2 py-0.5 rounded-full font-bold', styles.badgeBg)}>{styles.badge}</span>
        </div>
        <p className={cn('text-sm font-medium', styles.text)}>{r.message}</p>
        <p className="text-xs text-muted-foreground mt-1">Gem. {formatEUR(r.pricePerM2)}/m²</p>
      </div>
    </div>
  );
};

export default Koopkracht;
