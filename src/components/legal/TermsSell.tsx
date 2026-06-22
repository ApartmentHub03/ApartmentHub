import LegalDocument from "@/components/legal/LegalDocument";
import { verkoopSections } from "@/legal/algemene-voorwaarden-verkoop";

export default function AlgemeneVoorwaardenVerkoop() {
  return (
    <LegalDocument
      title="Algemene Voorwaarden Verkoopbemiddeling"
      subtitle="Apartmenthub B.V. · bemiddeling bij verkoop van woningen"
      sections={verkoopSections}
    />
  );
}

