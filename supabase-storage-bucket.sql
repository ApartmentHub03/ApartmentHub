-- Create storage bucket for documents
-- Run this in your Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('dossier-documents', 'dossier-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'dossier-documents');

CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'dossier-documents');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'dossier-documents');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'dossier-documents');
