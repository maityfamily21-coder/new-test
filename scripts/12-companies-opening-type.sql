-- 1) Add columns if missing
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS opening_type VARCHAR(20) NOT NULL DEFAULT 'job' CHECK (opening_type IN ('job','internship')),
  ADD COLUMN IF NOT EXISTS tenure_days INTEGER;

-- 2) Backfill legacy rows
UPDATE companies
SET opening_type = 'job'
WHERE opening_type IS NULL;

-- 3) Constraint: tenure_days is required and > 0 when internship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_internship_tenure_check'
  ) THEN
    ALTER TABLE companies
    ADD CONSTRAINT companies_internship_tenure_check
    CHECK (
      (opening_type = 'internship' AND tenure_days IS NOT NULL AND tenure_days > 0)
      OR opening_type <> 'internship'
    );
  END IF;
END$$;
