import { useCity } from '@/contexts/CityContext';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, Target, Home } from 'lucide-react';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/Reveal';
import CountUp from '@/components/motion/CountUp';

const data = {
  amsterdam: {
    label: 'Amsterdam',
    pricePerM2: 8500,
    timeToSell: 30,
    aboveAsking: 74,
    yoy: 4.7,
  },
  utrecht: {
    label: 'Midden Nederland',
    pricePerM2: 5900,
    timeToSell: 24,
    aboveAsking: 70,
    yoy: 5.0,
  },
} as const;

const nlInt = (n: number) =>
  Math.round(n).toLocaleString('nl-NL').replace(/,/g, '.');
const nlDec1 = (n: number) =>
  n.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface Props { title?: string; }

const MarketDataBlock = ({ title }: Props) => {
  const { city } = useCity();
  const key = city === 'utrecht' ? 'utrecht' : 'amsterdam';
  const d = data[key];

  const items = [
    { icon: Home, label: 'Gemiddelde prijs per m²', to: d.pricePerM2, format: (n: number) => `EUR ${nlInt(n)}` },
    { icon: Clock, label: 'Gemiddelde verkooptijd', to: d.timeToSell, format: (n: number) => `${Math.round(n)} dagen` },
    { icon: Target, label: 'Verkocht boven vraagprijs', to: d.aboveAsking, format: (n: number) => `${Math.round(n)}%` },
    { icon: TrendingUp, label: 'Prijsontwikkeling per jaar', to: d.yoy, format: (n: number) => `+${nlDec1(n)}%` },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-2">
            {title ?? `Marktdata ${d.label}`}
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            Actuele cijfers voor de woningmarkt in {d.label}.
          </p>
        </Reveal>
        <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((it) => (
            <StaggerItem key={it.label}>
              <Card className="card-lift h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-myrtle/10 text-myrtle flex items-center justify-center mb-4 mx-auto">
                    <it.icon className="w-6 h-6" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground mb-1 tabular-nums">
                    <CountUp to={it.to} format={it.format} />
                  </div>
                  <p className="text-sm text-muted-foreground">{it.label}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <Reveal delay={0.1}>
          <p className="text-xs text-muted-foreground text-center mt-8">
            Bron: NVM en Kadaster, Q1 2026. Cijfers indicatief en per kwartaal geactualiseerd.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default MarketDataBlock;
