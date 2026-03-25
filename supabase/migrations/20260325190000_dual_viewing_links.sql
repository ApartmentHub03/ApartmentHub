-- Add columns for start/end datetime range and dual viewing links (in-person + video)
ALTER TABLE admin_apartment
  ADD COLUMN IF NOT EXISTS slot_end_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS eventlink_video text,
  ADD COLUMN IF NOT EXISTS cal_event_type_id_video text;
