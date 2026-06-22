import { Link } from 'react-router-dom';
import { useCity } from '@/contexts/CityContext';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/Reveal';
import { NEIGHBORHOOD_PRICES, type City } from '@/lib/valuation';
import { TrendingUp, ChevronRight, Calculator } from 'lucide-react';
import NeighborhoodIcon from '@/components/NeighborhoodIcon';

interface Props {
  variant?: 'koop' | 'verkoop';
}

const cityLabel = (c: City) => (c === 'utrecht' ? 'Midden Nederland' : 'Amsterdam');
const cityYoY: Record<City, string> = {
  amsterdam: '+4,7%',
  utrecht: '+5,0%',
};

// Map display name -> route slug (must match marketData.ts keys)
const SLUGS: Record<string, string> = {
  // Amsterdam
  'Oud Zuid': 'oud-zuid',
  Jordaan: 'jordaan',
  Centrum: 'centrum',
  'De Pijp': 'de-pijp',
  Zuidas: 'zuidas',
  Oost: 'oost',
  Noord: 'noord',
  West: 'west',
  // Utrecht / Midden Nederland
  Binnenstad: 'binnenstad',
  Wittevrouwen: 'wittevrouwen',
  Lombok: 'lombok',
  'Oog in Al': 'oog-in-al',
  Voordorp: 'voordorp',
  'Leidsche Rijn': 'leidsche-rijn',
  Tuinwijk: 'tuinwijk',
  Wilhelminapark: 'wilhelminapark',
};

// Slugs that have a dedicated image asset in NeighborhoodIcon
const HAS_ASSET = new Set([
  'de-pijp', 'centrum', 'jordaan', 'noord', 'oost',
  'oud-zuid', 'zuidas', 'zeeburg', 'nieuw-west',
]);

// Curated Unsplash photos per wijk — verified loading, matched to wijk character.
// Keep in sync with detail page if/when it shows a hero image.
const FALLBACK_IMAGES: Record<string, string> = {
  west: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Mercatorplein_2.JPG/1280px-Mercatorplein_2.JPG',
  binnenstad: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/View_of_Oudegracht_from_Vollersbrug%2C_Utrecht_2024-11-28.jpg/1280px-View_of_Oudegracht_from_Vollersbrug%2C_Utrecht_2024-11-28.jpg',
  wittevrouwen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Kapelstraat_Utrecht_Nederland.JPG/1280px-Kapelstraat_Utrecht_Nederland.JPG',
  lombok: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Utrecht-Lombok_-_Kanaalstraat.jpg/1280px-Utrecht-Lombok_-_Kanaalstraat.jpg',
  'oog-in-al': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Oude-Rijn-Oog-in-Al.JPG/1280px-Oude-Rijn-Oog-in-Al.JPG',
  voordorp: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Voordorp.JPG/1280px-Voordorp.JPG',
  'leidsche-rijn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Centrum_Leidsche_Rijn%2C_Utrecht_%2850004554237%29.jpg/1280px-Centrum_Leidsche_Rijn%2C_Utrecht_%2850004554237%29.jpg',
  tuinwijk: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Tuinwijk-Oost%2C_Utrecht%2C_Netherlands_-_panoramio_%285%29.jpg/1280px-Tuinwijk-Oost%2C_Utrecht%2C_Netherlands_-_panoramio_%285%29.jpg',
  wilhelminapark: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Utrecht_TeaHouse_Wilhelminapark_018_2444.jpg/1280px-Utrecht_TeaHouse_Wilhelminapark_018_2444.jpg',
};

// Short character descriptions per wijk
const DESCRIPTIONS: Record<string, string> = {
  // Amsterdam
  'oud-zuid': 'Prestigieus en groen rond het Museumkwartier',
  jordaan: 'Iconisch, intiem en vol historische grachtenpanden',
  centrum: 'Bruisend hart met grachten, cultuur en horeca',
  'de-pijp': 'Levendig en cosmopolitisch rond de Albert Cuyp',
  zuidas: 'Modern zakendistrict met internationale allure',
  oost: 'Trendy en groen, populair bij gezinnen en creatieven',
  noord: 'Hip en in opkomst, ruim wonen aan het IJ',
  west: 'Authentiek Amsterdams met levendige hotspots',
  // Utrecht / Midden Nederland
  binnenstad: 'Middeleeuws centrum met werven en grachten',
  wittevrouwen: 'Stijlvolle gezinswijk vlakbij het centrum',
  lombok: 'Multicultureel en bruisend met de Kanaalstraat',
  'oog-in-al': 'Rustig wonen aan het water, dichtbij de stad',
  voordorp: 'Groene familiewijk met dorpse sfeer',
  'leidsche-rijn': 'Moderne, ruime nieuwbouwwijk voor gezinnen',
  tuinwijk: 'Karakteristieke jaren ‘30 wijk met veel groen',
  wilhelminapark: 'Voornaam en groen rond het park',
};

const formatEUR = (n: number) => new Intl.NumberFormat('nl-NL').format(n);
const pad2 = (n: number) => String(n).padStart(2, '0');

const NeighborhoodPrices = ({ variant = 'koop' }: Props) => {
  const { city } = useCity();
  const activeCity: City = city === 'utrecht' ? 'utrecht' : 'amsterdam';
  const prices = NEIGHBORHOOD_PRICES[activeCity];

  const sorted = Object.entries(prices).sort((a, b) => b[1] - a[1]);

  const subtitle = `Gemiddelde prijzen per wijk in ${cityLabel(activeCity)}`;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-2xl md:text-4xl font-bold text-center text-foreground mb-3">
            Prijzen per wijk in {cityLabel(activeCity)}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </Reveal>

        <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
          {sorted.map(([wijk, pricePerM2], idx) => {
            const avgHome = Math.round((pricePerM2 * 85) / 1000) * 1000;
            const slug = SLUGS[wijk];
            const description = slug ? DESCRIPTIONS[slug] : undefined;
            const hasAsset = slug ? HAS_ASSET.has(slug) : false;
            const fallback = slug ? FALLBACK_IMAGES[slug] : undefined;

            const card = (
              <article className="group h-full bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {hasAsset ? (
                    <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110">
                      <NeighborhoodIcon
                        neighborhood={slug!}
                        className="!rounded-none"
                      />
                    </div>
                  ) : fallback ? (
                    <img
                      src={fallback}
                      alt={`${wijk} sfeerbeeld`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-myrtle/20 to-orange/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 text-xs font-bold text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    {pad2(idx + 1)}
                  </div>
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold text-myrtle bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                    <TrendingUp className="w-3 h-3" />
                    {cityYoY[activeCity]}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-myrtle transition-colors">
                    {wijk}
                  </h3>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {description}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-border space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Gem.{' '}
                      <span className="font-semibold text-foreground">
                        EUR {formatEUR(pricePerM2)}
                      </span>{' '}
                      /m2
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Gem. woning ca.{' '}
                      <span className="font-semibold text-foreground">
                        EUR {formatEUR(avgHome)}
                      </span>
                    </p>
                  </div>

                  {slug && (
                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-myrtle">
                      Bekijk wijk
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>
              </article>
            );

            return (
              <StaggerItem key={wijk}>
                {slug ? (
                  <Link
                    to={`/wijk/${slug}`}
                    aria-label={`Bekijk wijkdetails en grafieken voor ${wijk}`}
                    className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-myrtle rounded-2xl"
                  >
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        {/* Calculator CTA */}
        <Reveal>
          <div className="mt-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[#009B8A] to-[#FF7D28] shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-8 md:px-10 md:py-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                {variant === 'verkoop'
                  ? 'Benieuwd wat jouw woning oplevert?'
                  : 'Benieuwd wat jij hier kunt kopen?'}
              </h3>
              <p className="text-white/90 text-sm md:text-base max-w-md mb-6">
                {variant === 'verkoop'
                  ? 'Bereken in 2 minuten een onderbouwde verkoopwaarde voor jouw woning.'
                  : 'Bereken in 2 minuten wat haalbaar is binnen jouw budget.'}
              </p>
              <Link
                to={variant === 'verkoop' ? '/waardebepaling' : '/koopkracht'}
                className="inline-flex items-center gap-2 bg-white text-[#009B8A] font-semibold px-6 py-3 rounded-full shadow-sm hover:bg-white/90 hover:scale-[1.02] transition-all duration-200"
              >
                {variant === 'verkoop'
                  ? 'Bereken je verkoopwaarde'
                  : 'Bereken je koopkracht'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <p className="text-xs text-muted-foreground text-center mt-8">
            Indicatieve cijfers, bron NVM en Kadaster Q1 2026. Per kwartaal geactualiseerd.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default NeighborhoodPrices;
