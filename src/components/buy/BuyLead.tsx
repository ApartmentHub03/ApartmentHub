import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCity } from "@/contexts/CityContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Check, Home } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "Start",
  "Gegevens",
  "Profiel",
  "Financiering",
  "Wensen",
  "Planning",
  "Akkoord",
];

const COUNTRIES = [
  "Nederland", "België", "Duitsland", "Verenigd Koninkrijk", "Verenigde Staten",
  "Frankrijk", "Italië", "Spanje", "Portugal", "Polen", "Zweden", "Noorwegen",
  "Denemarken", "Finland", "Ierland", "Oostenrijk", "Zwitserland", "Australië",
  "Canada", "Brazilië", "India", "China", "Japan", "Zuid-Afrika", "Anders",
];

const NEIGHBORHOODS: Record<"amsterdam" | "utrecht", string[]> = {
  amsterdam: ["Centrum", "Jordaan", "De Pijp", "Oud Zuid", "Oost", "West", "Noord", "Zuidas"],
  utrecht: ["Binnenstad", "Wittevrouwen", "Lombok", "Oog in Al", "Voordorp", "Leidsche Rijn", "Tuinwijk", "Wilhelminapark"],
};

const BUDGETS = [
  "Tot € 500.000",
  "€ 500.000 tot 750.000",
  "€ 750.000 tot 1.000.000",
  "€ 1.000.000 tot 1.500.000",
  "€ 1.500.000+",
];

const PROPERTY_TYPES = ["Appartement", "Eengezinswoning", "Penthouse", "Maisonette", "Geen voorkeur"];
const BEDROOMS = ["1", "2", "3", "4+"];
const MUST_HAVES = ["Balkon", "Tuin", "Parkeerplek", "Lift", "Buitenruimte algemeen"];
const TIMELINES = [
  "Zo snel mogelijk (0-3 mnd)",
  "3 tot 6 maanden",
  "6 tot 12 maanden",
  "Meer dan 12 maanden",
  "Open / geen haast",
];

type LeadData = {
  journey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  buyerType: string;
  livesInNL: string;
  household: string;
  mortgageStatus: string;
  budget: string;
  ownCapital: string;
  neighborhoods: string[];
  otherNeighborhood: string;
  minBedrooms: string;
  propertyType: string;
  minSqm: string;
  mustHaves: string[];
  timeline: string;
  agreed: boolean;
  marketingOptIn: boolean;
};

const initialData: LeadData = {
  journey: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "+31 ",
  nationality: "Nederland",
  buyerType: "",
  livesInNL: "",
  household: "",
  mortgageStatus: "",
  budget: "",
  ownCapital: "",
  neighborhoods: [],
  otherNeighborhood: "",
  minBedrooms: "",
  propertyType: "",
  minSqm: "",
  mustHaves: [],
  timeline: "",
  agreed: false,
  marketingOptIn: true,
};

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
      active
        ? "bg-[#009B8A] text-white border-[#009B8A]"
        : "bg-background text-foreground border-input hover:border-[#009B8A]"
    }`}
  >
    {children}
  </button>
);

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-[44px] px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
      active
        ? "bg-[#009B8A] text-white border-[#009B8A]"
        : "bg-background text-foreground border-input hover:border-[#009B8A]"
    }`}
  >
    {children}
  </button>
);

const NeighborhoodCard = ({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative min-h-[88px] p-4 rounded-xl border-2 font-semibold text-base transition-all text-left ${
      active
        ? "bg-[#009B8A] text-white border-[#009B8A] shadow-md"
        : "bg-background text-foreground border-input hover:border-[#009B8A] hover:shadow-sm"
    }`}
  >
    {active && (
      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-[#009B8A] flex items-center justify-center">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    )}
    {name}
  </button>
);

export default function KoopLead() {
  const navigate = useNavigate();
  const { city } = useCity();
  const cityKey = (city ?? "amsterdam") as "amsterdam" | "utrecht";
  const [step, setStep] = useState(1);
  const [data, setData] = useState<LeadData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const update = <K extends keyof LeadData>(key: K, value: LeadData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleArr = (key: "neighborhoods" | "mustHaves", value: string) =>
    setData((d) => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value],
    }));

  const goToStep = (next: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 250);
  };

  const autoAdvance = <K extends keyof LeadData>(key: K, value: LeadData[K], nextStep: number) => {
    update(key, value);
    setTimeout(() => goToStep(nextStep), 300);
  };

  const handleJourney = (value: string) => {
    update("journey", value);
    if (value === "Verkopen") {
      setTimeout(() => navigate("/verkoop"), 300);
      return;
    }
    setTimeout(() => goToStep(2), 300);
  };

  const canNext = () => {
    switch (step) {
      case 1: return data.journey === "Kopen";
      case 2: return data.firstName && data.lastName && /\S+@\S+\.\S+/.test(data.email) && data.phone.length > 5 && data.nationality;
      case 3: return data.buyerType && data.livesInNL && data.household;
      case 4: return data.mortgageStatus && data.budget;
      case 5: return data.minBedrooms && data.propertyType;
      case 6: return data.timeline;
      case 7: return data.agreed;
      default: return false;
    }
  };

  const submit = async () => {
    setLoading(true);
    const payload = { ...data, city: cityKey, timestamp: new Date().toISOString() };
    console.log("LEAD:", payload);
    try {
      await (supabase as any).from("koop_leads").insert(payload);
    } catch (e) {
      console.warn("koop_leads insert skipped:", e);
    }
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#009B8A]/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-[#009B8A]" />
            </div>
            <h1 className="text-2xl font-bold">Bedankt, {data.firstName}!</h1>
            <p className="text-muted-foreground">
              We bellen je binnen 24 uur. Houd je WhatsApp in de gaten.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/")} variant="outline">
                <Home className="w-4 h-4 mr-2" /> Terug naar home
              </Button>
              <Button onClick={() => navigate("/koop")} className="bg-[#FF7D28] hover:bg-[#FF7D28]/90 text-white">
                Bekijk vast onze marktdata
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-semibold text-[#009B8A]">
            Stap {step} van {STEPS.length}
          </span>
          <span className="text-muted-foreground">{STEPS[step - 1]}</span>
        </div>
        <Progress value={(step / STEPS.length) * 100} className="h-2" />
        <div className="hidden md:flex justify-between mt-3 text-xs text-muted-foreground">
          {STEPS.map((s, i) => (
            <span key={s} className={i + 1 === step ? "text-[#009B8A] font-semibold" : ""}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div
            className={`space-y-6 transition-all duration-250 ${
              transitioning ? "opacity-0 translate-y-2.5" : "opacity-100 translate-y-0"
            }`}
          >
            {step === 1 && (
              <>
                <h2 className="text-2xl font-bold">Ik wil hulp met...</h2>
                <p className="text-muted-foreground">Kies waarmee we je kunnen helpen.</p>
                <div className="grid grid-cols-2 gap-3">
                  {["Kopen", "Verkopen"].map((j) => (
                    <button
                      key={j}
                      onClick={() => handleJourney(j)}
                      className={`min-h-[120px] p-6 rounded-xl border-2 font-semibold text-lg transition-all ${
                        data.journey === j
                          ? "border-[#009B8A] bg-[#009B8A]/5"
                          : "border-input hover:border-[#009B8A] hover:shadow-sm"
                      }`}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-2xl font-bold">Even kennismaken</h2>
                <p className="text-muted-foreground">
                  We gebruiken je email voor afspraken en je telefoon voor WhatsApp-updates.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Voornaam</Label>
                    <Input value={data.firstName} onChange={(e) => update("firstName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Achternaam</Label>
                    <Input value={data.lastName} onChange={(e) => update("lastName", e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Emailadres</Label>
                    <Input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Telefoonnummer / WhatsApp</Label>
                    <Input type="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Nationaliteit</Label>
                    <Select value={data.nationality} onValueChange={(v) => update("nationality", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-2xl font-bold">Over jou als koper</h2>
                <div className="space-y-5">
                  <div>
                    <Label className="mb-3 block">Wat voor koper ben je?</Label>
                    <RadioGroup value={data.buyerType} onValueChange={(v) => update("buyerType", v)}>
                      {["Eerste woning", "Doorstromer", "Belegger", "Tweede huis"].map((o) => (
                        <label key={o} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-[#009B8A]">
                          <RadioGroupItem value={o} /> <span>{o}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="mb-3 block">Volledig in Nederland wonen?</Label>
                    <RadioGroup value={data.livesInNL} onValueChange={(v) => update("livesInNL", v)} className="flex gap-4">
                      {["Ja", "Nee"].map((o) => (
                        <label key={o} className="flex items-center gap-2 p-3 border rounded-lg flex-1 cursor-pointer hover:border-[#009B8A]">
                          <RadioGroupItem value={o} /> <span>{o}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="mb-3 block">Met partner of solo?</Label>
                    <RadioGroup value={data.household} onValueChange={(v) => update("household", v)}>
                      {["Solo", "Met partner", "Met familie"].map((o) => (
                        <label key={o} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-[#009B8A]">
                          <RadioGroupItem value={o} /> <span>{o}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="text-2xl font-bold">Financiering</h2>
                <div className="space-y-5">
                  <div>
                    <Label className="mb-3 block">Hypotheek-status</Label>
                    <div className="space-y-2">
                      {["Pre-approval", "In gesprek met adviseur", "Volledig eigen geld", "Nog niet gestart"].map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => {
                            update("mortgageStatus", o);
                            if (data.budget) {
                              setTimeout(() => goToStep(5), 300);
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-all ${
                            data.mortgageStatus === o
                              ? "border-[#009B8A] bg-[#009B8A]/5"
                              : "border-input hover:border-[#009B8A]"
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-3 block">Aankoopbudget k.k.</Label>
                    <div className="flex flex-wrap gap-2">
                      {BUDGETS.map((b) => (
                        <Pill key={b} active={data.budget === b} onClick={() => {
                          update("budget", b);
                          if (data.mortgageStatus) {
                            setTimeout(() => goToStep(5), 300);
                          }
                        }}>{b}</Pill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Eigen geld beschikbaar (€)</Label>
                    <Input value={data.ownCapital} onChange={(e) => update("ownCapital", e.target.value)} placeholder="bv. 100.000" />
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="text-2xl font-bold">Jouw woonwensen</h2>
                <div className="space-y-5">
                  <div>
                    <Label className="mb-3 block">
                      Voorkeurswijken in {cityKey === "amsterdam" ? "Amsterdam" : "Midden Nederland"}
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {NEIGHBORHOODS[cityKey].map((n) => (
                        <NeighborhoodCard
                          key={n}
                          name={n}
                          active={data.neighborhoods.includes(n)}
                          onClick={() => toggleArr("neighborhoods", n)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Andere wijk?</Label>
                    <Input value={data.otherNeighborhood} onChange={(e) => update("otherNeighborhood", e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-3 block">Min slaapkamers</Label>
                    <div className="flex flex-wrap gap-2">
                      {BEDROOMS.map((b) => (
                        <Pill key={b} active={data.minBedrooms === b} onClick={() => update("minBedrooms", b)}>{b}</Pill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-3 block">Type woning</Label>
                    <div className="flex flex-wrap gap-2">
                      {PROPERTY_TYPES.map((t) => (
                        <Pill key={t} active={data.propertyType === t} onClick={() => update("propertyType", t)}>{t}</Pill>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Min m²</Label>
                    <Input value={data.minSqm} onChange={(e) => update("minSqm", e.target.value)} placeholder="bv. 75" />
                  </div>
                  <div>
                    <Label className="mb-3 block">Must-haves</Label>
                    <div className="flex flex-wrap gap-2">
                      {MUST_HAVES.map((m) => (
                        <Chip key={m} active={data.mustHaves.includes(m)} onClick={() => toggleArr("mustHaves", m)}>{m}</Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <h2 className="text-2xl font-bold">Timing</h2>
                <div className="space-y-5">
                  <div>
                    <Label className="mb-3 block">Wanneer wil je kopen?</Label>
                    <div className="flex flex-wrap gap-2">
                      {TIMELINES.map((t) => (
                        <Pill key={t} active={data.timeline === t} onClick={() => autoAdvance("timeline", t, 7)}>{t}</Pill>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 7 && (
              <>
                <h2 className="text-2xl font-bold">Bijna klaar, controleer je gegevens</h2>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                  <div><span className="font-semibold">Naam:</span> {data.firstName} {data.lastName}</div>
                  <div><span className="font-semibold">Email:</span> {data.email}</div>
                  <div><span className="font-semibold">Telefoon:</span> {data.phone}</div>
                  <div><span className="font-semibold">Nationaliteit:</span> {data.nationality}</div>
                  <div><span className="font-semibold">Koperprofiel:</span> {data.buyerType} · {data.household} · NL: {data.livesInNL}</div>
                  <div><span className="font-semibold">Financiering:</span> {data.mortgageStatus} · {data.budget} · eigen geld € {data.ownCapital || "n.v.t."}</div>
                  <div><span className="font-semibold">Wijken:</span> {[...data.neighborhoods, data.otherNeighborhood].filter(Boolean).join(", ") || "n.v.t."}</div>
                  <div><span className="font-semibold">Woning:</span> {data.propertyType} · {data.minBedrooms} slpk · min {data.minSqm || "n.v.t."} m²</div>
                  <div><span className="font-semibold">Must-haves:</span> {data.mustHaves.join(", ") || "n.v.t."}</div>
                  <div><span className="font-semibold">Timing:</span> {data.timeline}</div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={data.agreed} onCheckedChange={(v) => update("agreed", !!v)} className="mt-1" />
                    <span className="text-sm">
                      Ik ga akkoord met de{" "}
                      <a href="/algemene-voorwaarden/koop" target="_blank" rel="noreferrer" className="text-[#009B8A] underline">
                        algemene voorwaarden koop
                      </a>{" "}
                      en de{" "}
                      <a href="/privacyverklaring" target="_blank" rel="noreferrer" className="text-[#009B8A] underline">
                        privacyverklaring
                      </a>.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={data.marketingOptIn} onCheckedChange={(v) => update("marketingOptIn", !!v)} className="mt-1" />
                    <span className="text-sm">Stuur me ook off-market aanbod en marktupdates via WhatsApp.</span>
                  </label>
                </div>
                <Button
                  onClick={submit}
                  disabled={!canNext() || loading}
                  className="w-full bg-[#FF7D28] hover:bg-[#FF7D28]/90 text-white min-h-[48px] text-base"
                >
                  {loading ? "Versturen..." : "Plan kennismakingsgesprek"}
                </Button>
              </>
            )}

            {/* Nav buttons */}
            {step > 1 && step < 7 && (
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => goToStep(step - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Vorige
                </Button>
                <Button
                  onClick={() => {
                    if (!canNext()) {
                      toast.error("Vul de verplichte velden in");
                      return;
                    }
                    goToStep(step + 1);
                  }}
                  className="bg-[#009B8A] hover:bg-[#FF7D28] text-white"
                >
                  Volgende <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            {step === 7 && (
              <div className="flex justify-start">
                <Button variant="outline" onClick={() => goToStep(6)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Vorige
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
