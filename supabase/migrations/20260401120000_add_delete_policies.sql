-- Add DELETE policies for personen and documenten tables
-- These were missing, causing all client-side deletes to silently fail via RLS

CREATE POLICY "Allow all personen delete" ON personen FOR DELETE USING (true);
CREATE POLICY "Allow all documenten delete" ON documenten FOR DELETE USING (true);
