import NeighborhoodDetail from '@/pages/NeighborhoodDetail';
import { neighborhoodsData } from '@/data/neighborhoodsData';

const SITE_URL = 'https://apartmenthub.nl';

const FALLBACK_DESCRIPTIONS = {
    centrum: 'Huurappartementen in Amsterdam Centrum. Ontdek de historische grachtengordel, topattracties en actuele huurprijzen in het hart van de stad.',
    noord: 'Huurappartementen in Amsterdam Noord. Ontdek de NDSM, het EYE Filmmuseum en het creatieve, waterrijke karakter van Noord.',
    jordaan: 'Huurappartementen in de Jordaan, Amsterdam. Vind een huurwoning tussen de smalle straatjes, verborgen hofjes en iconische cafés.',
    oost: 'Huurappartementen in Amsterdam Oost. Groen Oosterpark, divers eten en een ontspannen, gezinsvriendelijke sfeer dicht bij het centrum.',
    zeeburg: 'Huurappartementen in Zeeburg, Amsterdam. Wonen aan het water nabij het IJ met karakteristieke architectuur en goede bereikbaarheid.',
    zuidas: 'Huurappartementen in Zuidas, Amsterdam. Modern wonen in hoogbouw in het internationale zakendistrict met uitstekende OV-verbindingen.',
    'de-pijp': "Huurappartementen in De Pijp, Amsterdam. Woon bij de Albert Cuypmarkt in een van de levendigste, culinaire wijken van Amsterdam.",
    'oud-zuid': 'Huurappartementen in Oud-Zuid, Amsterdam. Elegante straten nabij het Vondelpark, Museumplein en de P.C. Hooftstraat.',
    'nieuw-west': 'Huurappartementen in Nieuw-West, Amsterdam. Ruim en groen wonen rondom de Sloterplas met betaalbare opties en goede verbindingen.',
};

export async function generateMetadata({ params }) {
    const { id: rawId } = await params;
    const slug = decodeURIComponent(rawId || '').trim();
    const data = neighborhoodsData[slug]?.nl;
    const canonical = `${SITE_URL}/nl/neighborhood/${slug}`;

    if (!data) {
        return {
            title: 'Amsterdam Wijk | ApartmentHub',
            description: 'Ontdek de wijken van Amsterdam en vind huurappartementen met ApartmentHub.',
            alternates: { canonical },
        };
    }

    const title = `Huurappartementen in ${data.title}, Amsterdam | ApartmentHub`;
    const description = FALLBACK_DESCRIPTIONS[slug] || `Huurappartementen in ${data.title}, Amsterdam. ${data.description}`;

    return {
        title,
        description,
        alternates: {
            canonical,
            languages: {
                en: `${SITE_URL}/en/neighborhood/${slug}`,
                nl: `${SITE_URL}/nl/neighborhood/${slug}`,
            },
        },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

export default function Page() {
    return <NeighborhoodDetail />;
}
