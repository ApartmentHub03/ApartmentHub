/**
 * Database types. Re-genereer met:
 *   supabase gen types typescript --local > app/lib/database.types.ts
 */

export type Database = {
  public: {
    Tables: {
      verkoop_leads: {
        Row: {
          id: string;
          created_at: string;
          adres: string;
          naam: string;
          email: string;
          telefoon: string | null;
          beste_moment: string | null;
          taal: "nl" | "en";
          status: "new" | "contacted" | "viewing_scheduled" | "sold" | "stopped";
          bag_id: string | null;
          agent_assigned: string | null;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["verkoop_leads"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["verkoop_leads"]["Row"]>;
      };
      verkoop_dossiers: {
        Row: {
          id: string;
          created_at: string;
          lead_id: string | null;
          straat: string;
          postcode: string;
          woonplaats: string | null;
          naam: string;
          email: string;
          telefoon: string | null;
          taal: "nl" | "en";
          vraagprijs: number | null;
          oplev_datum: string | null;
          motivatie: string | null;
          gebreken_toel: string | null;
          vve_sfeer: string | null;
          verbouw_toel: string | null;
          antwoorden: Record<string, unknown> | null;
          ai_summary: string[] | null;
          ai_prefilled: Record<string, unknown> | null;
          ai_skipped: string[] | null;
          enrichment: Record<string, unknown> | null;
          consent: boolean;
          consent_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["verkoop_dossiers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["verkoop_dossiers"]["Row"]>;
      };
      verkoop_files: {
        Row: {
          id: string;
          dossier_id: string;
          doc_key: string;
          filename: string;
          mime_type: string | null;
          size_bytes: number | null;
          blob_url: string;
          uploaded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["verkoop_files"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["verkoop_files"]["Row"]>;
      };
    };
  };
};
