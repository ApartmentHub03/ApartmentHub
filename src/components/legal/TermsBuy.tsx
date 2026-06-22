import LegalDocument from "@/components/legal/LegalDocument";
import { koopSections } from "@/legal/algemene-voorwaarden-koop";

export default function AlgemeneVoorwaardenKoop() {
  return (
    <LegalDocument
      title="Algemene Voorwaarden Aankoopbemiddeling"
      subtitle="Apartmenthub B.V. · bemiddeling bij aankoop van woningen"
      sections={koopSections}
    />
  );
}

