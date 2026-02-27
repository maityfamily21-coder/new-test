-- Ensure default is Absent for any future inserts without explicit status
ALTER TABLE seminar_attendance
  ALTER COLUMN status SET DEFAULT 'Absent';

-- Backfill any NULL statuses to 'Absent' just in case
UPDATE seminar_attendance
SET status = 'Absent'
WHERE status IS NULL;

-- Keep existing CHECK constraint; if missing, re-assert it (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'seminar_attendance_status_check'
  ) THEN
    ALTER TABLE seminar_attendance
      ADD CONSTRAINT seminar_attendance_status_check
      CHECK (status IN ('Present','Absent'));
  END IF;
END $$;
