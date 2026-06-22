import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCity } from '@/contexts/CityContext';
import { getLocalizedPath } from '@/utils/routeUtils';
import NeighborhoodIcon from '@/components/NeighborhoodIcon';
import { NEIGHBORHOOD_PRICES, type City } from '@/lib/valuation';

type Neighborhood = {
  id: string;
  name: string;
  description: string;
  number: string;
  linkable: boolean;
  priceKey?: string;
};

interface Props {
  variant?: 'koop' | 'verkoop';
}

const formatEUR = (n: number) => new Intl.NumberFormat('nl-NL').format(n);

const NeighborhoodsCarousel = ({ variant: _variant }: Props) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { city } = useCity();

  const amsterdamNeighborhoods: Neighborhood[] = [
    { id: 'centrum', name: t('neighborhoods.centrum.name'), description: t('neighborhoods.centrum.description'), number: '01', linkable: true, priceKey: 'Centrum' },
    { id: 'jordaan', name: t('neighborhoods.jordaan.name'), description: t('neighborhoods.jordaan.description'), number: '02', linkable: true, priceKey: 'Jordaan' },
    { id: 'de-pijp', name: t('neighborhoods.dePijp.name'), description: t('neighborhoods.dePijp.description'), number: '03', linkable: true, priceKey: 'De Pijp' },
    { id: 'oost', name: t('neighborhoods.oost.name'), description: t('neighborhoods.oost.description'), number: '04', linkable: true, priceKey: 'Oost' },
    { id: 'noord', name: t('neighborhoods.noord.name'), description: t('neighborhoods.noord.description'), number: '05', linkable: true, priceKey: 'Noord' },
    { id: 'oud-zuid', name: t('neighborhoods.oudZuid.name'), description: t('neighborhoods.oudZuid.description'), number: '06', linkable: true, priceKey: 'Oud Zuid' },
    { id: 'zuidas', name: t('neighborhoods.zuidas.name'), description: t('neighborhoods.zuidas.description'), number: '07', linkable: true, priceKey: 'Zuidas' },
    { id: 'zeeburg', name: t('neighborhoods.zeeburg.name'), description: t('neighborhoods.zeeburg.description'), number: '08', linkable: true },
    { id: 'nieuw-west', name: t('neighborhoods.nieuwWest.name'), description: t('neighborhoods.nieuwWest.description'), number: '09', linkable: true, priceKey: 'West' },
  ];

  const utrechtNeighborhoods: Neighborhood[] = [
    { id: 'binnenstad', name: 'Binnenstad', description: 'Historisch hart met grachten, terrassen en de Dom.', number: '01', linkable: true, priceKey: 'Binnenstad' },
    { id: 'wittevrouwen', name: 'Wittevrouwen', description: 'Geliefde 19e-eeuwse buurt vlak bij het centrum.', number: '02', linkable: true, priceKey: 'Wittevrouwen' },
    { id: 'lombok', name: 'Lombok', description: 'Multiculturele wijk met levendige Kanaalstraat.', number: '03', linkable: true, priceKey: 'Lombok' },
    { id: 'oog-in-al', name: 'Oog in Al', description: 'Groen en rustig aan het Merwedekanaal.', number: '04', linkable: true, priceKey: 'Oog in Al' },
    { id: 'voordorp', name: 'Voordorp', description: 'Gezinsvriendelijke buurt met parken en scholen.', number: '05', linkable: true, priceKey: 'Voordorp' },
    { id: 'leidsche-rijn', name: 'Leidsche Rijn', description: 'Moderne nieuwbouwwijk met alle voorzieningen.', number: '06', linkable: true, priceKey: 'Leidsche Rijn' },
    { id: 'tuinwijk', name: 'Tuinwijk', description: 'Karakteristieke jaren-20 architectuur dichtbij centrum.', number: '07', linkable: true, priceKey: 'Tuinwijk' },
    { id: 'wilhelminapark', name: 'Wilhelminapark', description: 'Prestigieuze villabuurt rond het stadspark.', number: '08', linkable: true, priceKey: 'Wilhelminapark' },
  ];

  const activeCity: City = city === 'utrecht' ? 'utrecht' : 'amsterdam';
  const isUtrecht = activeCity === 'utrecht';
  const neighborhoods = isUtrecht ? utrechtNeighborhoods : amsterdamNeighborhoods;
  const prices = NEIGHBORHOOD_PRICES[activeCity];
  const sectionTitle = isUtrecht
    ? 'Ontdek de wijken van Midden Nederland'
    : 'Ontdek de wijken van Amsterdam';

  const duplicatedNeighborhoods = [...neighborhoods, ...neighborhoods];

  const startAutoScroll = (direction: 'left' | 'right') => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      if (carouselRef.current) {
        const scrollContainer = carouselRef.current.querySelector('[data-scroll-container]') as HTMLElement;
        if (scrollContainer) {
          const scrollAmount = direction === 'right' ? 2 : -2;
          scrollContainer.scrollLeft += scrollAmount;
          const maxScroll = scrollContainer.scrollWidth / 2;
          if (scrollContainer.scrollLeft >= maxScroll) {
            scrollContainer.scrollLeft = 0;
          } else if (scrollContainer.scrollLeft <= 0 && direction === 'left') {
            scrollContainer.scrollLeft = maxScroll;
          }
        }
      }
    }, 16);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  useEffect(() => () => stopAutoScroll(), []);

  return (
    <section className="hidden md:block py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{sectionTitle}</h2>
        </div>

        <div
          ref={carouselRef}
          className="relative w-full max-w-6xl mx-auto"
          onMouseEnter={() => startAutoScroll('right')}
          onMouseLeave={stopAutoScroll}
        >
          <div
            data-scroll-container
            className="flex overflow-x-hidden gap-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ scrollBehavior: 'auto' }}
          >
            {duplicatedNeighborhoods.map((neighborhood, index) => {
              const pricePerM2 = neighborhood.priceKey ? prices[neighborhood.priceKey] : undefined;
              const CardInner = (
                <div className="bg-white rounded-2xl overflow-hidden w-72 h-[28rem] flex flex-col hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-200">
                  <div className="aspect-[4/3] flex items-center justify-center bg-gray-50 overflow-hidden">
                    <div className="w-full h-full">
                      <NeighborhoodIcon
                        neighborhood={neighborhood.id}
                        className="group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-2">{neighborhood.number}.</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-orange transition-colors">
                        {neighborhood.name}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{neighborhood.description}</p>
                      {pricePerM2 && (
                        <p className="text-sm font-semibold text-myrtle mt-3">
                          Gem. EUR {formatEUR(pricePerM2)} /m2
                        </p>
                      )}
                    </div>
                    {neighborhood.linkable && (
                      <div className="mt-4">
                        <span className="inline-flex items-center text-orange font-medium text-sm group-hover:text-myrtle transition-colors">
                          {t('neighborhoods.discoverMore')}
                          <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
              return (
                <div key={`${neighborhood.id}-${index}`} className="flex-shrink-0">
                  {neighborhood.linkable ? (
                    <Link
                      to={getLocalizedPath('neighborhood', language, { id: neighborhood.id })}
                      className="group block"
                    >
                      {CardInner}
                    </Link>
                  ) : (
                    <div className="group block">{CardInner}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="absolute left-0 top-0 w-32 h-full z-10 cursor-pointer"
            onMouseEnter={() => startAutoScroll('left')}
            onMouseLeave={stopAutoScroll}
          />
          <div
            className="absolute right-0 top-0 w-32 h-full z-10 cursor-pointer"
            onMouseEnter={() => startAutoScroll('right')}
            onMouseLeave={stopAutoScroll}
          />
        </div>
      </div>
    </section>
  );
};

export default NeighborhoodsCarousel;
