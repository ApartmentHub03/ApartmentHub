import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCity } from '@/contexts/CityContext';
import { useCityContacts } from '@/hooks/useCityContacts';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';

type Conditie = 'Uitstekend' | 'Goed' | 'Redelijk' | 'Renovatie nodig';

interface PropertyData {
  adres: string;
  postcode: string;
  m2: string;
  bouwjaar: string;
  conditie: Conditie | '';
}

interface LeadData {
  naam: string;
  email: string;
  telefoon: string;
  consent: boolean;
}

const formatEUR = (n: number) =>
  'EUR ' + Math.round(n).toLocaleString('de-DE').replace(/,/g, '.');

const conditionMultiplier = (c: Conditie): number => {
  switch (c) {
    case 'Uitstekend':
      return 1.1;
    case 'Goed':
      return 1.0;
    case 'Redelijk':
      return 0.92;
    case 'Renovatie nodig':
      return 0.85;
  }
};

const yearFactor = (y: number): number => {
  if (y >= 2000) return 1.05;
  if (y >= 1980) return 1.0;
  if (y >= 1950) return 0.97;
  return 1.03;
};

const ValuationWidget = () => {
  const { city } = useCity();
  const contacts = useCityContacts();
  const cityKey: 'amsterdam' | 'utrecht' = city === 'utrecht' ? 'utrecht' : 'amsterdam';
  const cityName = cityKey === 'utrecht' ? 'Midden Nederland' : 'Amsterdam';
  const basePerM2 = cityKey === 'utrecht' ? 5900 : 8500;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<PropertyData>({
    adres: '',
    postcode: '',
    m2: '',
    bouwjaar: '',
    conditie: '',
  });
  const [lead, setLead] = useState<LeadData>({
    naam: '',
    email: '',
    telefoon: '',
    consent: false,
  });

  const step1Valid =
    data.adres.trim() &&
    data.postcode.trim() &&
    Number(data.m2) > 0 &&
    Number(data.bouwjaar) >= 1850 &&
    Number(data.bouwjaar) <= 2026 &&
    data.conditie;

  const step2Valid = lead.naam.trim() && lead.email.trim() && lead.consent;

  const m2Num = Number(data.m2);
  const yearNum = Number(data.bouwjaar);
  const condMult = data.conditie ? conditionMultiplier(data.conditie as Conditie) : 1;
  const yFactor = yearNum ? yearFactor(yearNum) : 1;
  const estimate = basePerM2 * m2Num * condMult * yFactor;
  const low = estimate * 0.92;
  const high = estimate * 1.08;

  const handleLeadSubmit = async () => {
    const payload = {
      type: 'valuation' as const,
      adres: data.adres,
      postcode: data.postcode,
      m2: m2Num,
      bouwjaar: yearNum,
      conditie: data.conditie,
      naam: lead.naam,
      email: lead.email,
      telefoon: lead.telefoon,
      city: cityKey,
      indicative_low: Math.round(low),
      indicative_high: Math.round(high),
      timestamp: new Date().toISOString(),
    };
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      console.log('LEAD:', payload);
    }
    setStep(3);
  };

  return (
    <Card className="text-left shadow-lg">
      <CardContent className="p-6 md:p-8">
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Bereken je verkoopwaarde
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Vul de basisgegevens van je woning in voor een indicatieve waardering
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adres">Adres</Label>
              <Input
                id="adres"
                placeholder="Straat + huisnummer"
                value={data.adres}
                onChange={(e) => setData({ ...data, adres: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                placeholder="1017 PB"
                value={data.postcode}
                onChange={(e) => setData({ ...data, postcode: e.target.value })}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m2">Woonoppervlakte in m²</Label>
              <Input
                id="m2"
                type="number"
                min={10}
                max={2000}
                value={data.m2}
                onChange={(e) => setData({ ...data, m2: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bouwjaar">Bouwjaar</Label>
              <Input
                id="bouwjaar"
                type="number"
                min={1850}
                max={2026}
                value={data.bouwjaar}
                onChange={(e) => setData({ ...data, bouwjaar: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conditie">Staat woning</Label>
              <Select
                value={data.conditie}
                onValueChange={(v) => setData({ ...data, conditie: v as Conditie })}
              >
                <SelectTrigger id="conditie">
                  <SelectValue placeholder="Kies een optie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uitstekend">Uitstekend</SelectItem>
                  <SelectItem value="Goed">Goed</SelectItem>
                  <SelectItem value="Redelijk">Redelijk</SelectItem>
                  <SelectItem value="Renovatie nodig">Renovatie nodig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-orange hover:bg-orange/90 text-white"
              size="lg"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
            >
              Bereken waarde
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Bijna klaar!
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Voer je gegevens in om je indicatieve waardering te ontvangen.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="naam">Naam</Label>
              <Input
                id="naam"
                value={lead.naam}
                onChange={(e) => setLead({ ...lead, naam: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Emailadres</Label>
              <Input
                id="email"
                type="email"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
                maxLength={150}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefoon">Telefoonnummer (optioneel)</Label>
              <Input
                id="telefoon"
                type="tel"
                value={lead.telefoon}
                onChange={(e) => setLead({ ...lead, telefoon: e.target.value })}
                maxLength={30}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={lead.consent}
                onCheckedChange={(v) => setLead({ ...lead, consent: v === true })}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                Ik ga akkoord met de algemene voorwaarden en wil contact opnemen worden door
                ApartmentHub
              </Label>
            </div>

            <Button
              className="w-full bg-orange hover:bg-orange/90 text-white"
              size="lg"
              disabled={!step2Valid}
              onClick={handleLeadSubmit}
            >
              Toon mijn waardering
            </Button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-myrtle hover:underline mx-auto"
            >
              <ArrowLeft className="w-4 h-4" /> Terug
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Indicatieve waardering
              </h2>
              <p className="text-3xl md:text-4xl font-bold text-myrtle mt-4">
                {formatEUR(low)} - {formatEUR(high)}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                Indicatief op basis van basisgegevens. Voor een precieze taxatie raden wij een
                gesprek aan.
              </p>
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="reasoning">
                <AccordionTrigger>Wat zit erin?</AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>
                      Gemiddelde m²-prijs in {cityName}:{' '}
                      <span className="text-foreground font-medium">
                        {formatEUR(basePerM2)} / m²
                      </span>
                    </li>
                    <li>
                      Conditie-factor toegepast ({data.conditie}):{' '}
                      <span className="text-foreground font-medium">×{condMult.toFixed(2)}</span>
                    </li>
                    <li>
                      Bouwjaar-correctie ({yearNum}):{' '}
                      <span className="text-foreground font-medium">×{yFactor.toFixed(2)}</span>
                    </li>
                    <li>
                      Woonoppervlakte:{' '}
                      <span className="text-foreground font-medium">{m2Num} m²</span>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-orange hover:bg-orange/90 text-white"
                size="lg"
                asChild
              >
                <a
                  href={`https://wa.me/${contacts.phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </Button>
              <Button variant="outline" className="flex-1 border-myrtle text-myrtle hover:bg-myrtle/10" size="lg" asChild>
                <a
                  href={`tel:${contacts.phone.replace(/\s/g, '')}`}
                  className="flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Bel direct
                </a>
              </Button>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(1);
              }}
              className="flex items-center gap-1 text-sm text-myrtle hover:underline mx-auto"
            >
              <ArrowLeft className="w-4 h-4" /> Nieuwe berekening
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValuationWidget;
