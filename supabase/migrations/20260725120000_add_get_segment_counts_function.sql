-- Migration: Add get_segment_counts() SQL function for accurate aggregate counts.
--
-- The previous approach fetched all member rows and counted client-side,
-- which hit Supabase's default 1000-row response cap and showed wrong counts
-- when a segment had more than ~1000 members.
--
-- This function returns one row per segment with (segment_id, member_count),
-- counting only non-archived members. Tag-based exclusions are handled in SQL
-- so the CRM route doesn't need to fetch rows at all.

CREATE OR REPLACE FUNCTION public.get_segment_counts(exclude_students BOOLEAN DEFAULT false)
RETURNS TABLE (segment_id UUID, member_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        csm.segment_id,
        COUNT(*)::BIGINT AS member_count
    FROM public.candidate_segment_members csm
    WHERE csm.is_archived = false
      AND NOT EXISTS (
          SELECT 1 FROM unnest(csm.tags) AS tag
          WHERE lower(tag) IN ('opt_out', 'opt-in', 'rotterdam', 'almere')
      )
      AND (
          NOT exclude_students
          OR NOT EXISTS (
              SELECT 1 FROM unnest(csm.tags) AS tag
              WHERE lower(tag) = 'student'
          )
      )
    GROUP BY csm.segment_id;
$$;

COMMENT ON FUNCTION public.get_segment_counts IS 'Returns active member counts per segment, excluding opted-out/archived contacts. Pass exclude_students=true to also exclude student-tagged members.';

-- Grant execute to authenticated and service_role.
GRANT EXECUTE ON FUNCTION public.get_segment_counts(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_segment_counts(boolean) TO service_role;