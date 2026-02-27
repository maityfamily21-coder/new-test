-- 1) Add columns (if not exists)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS targeting_mode VARCHAR(20) NOT NULL DEFAULT 'interest' CHECK (targeting_mode IN ('interest','course_semester')),
  ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id),
  ADD COLUMN IF NOT EXISTS semester INTEGER;

-- 2) Backfill existing rows to 'interest' mode (only if targeting_mode is NULL for legacy datasets)
UPDATE companies
SET targeting_mode = 'interest'
WHERE targeting_mode IS NULL;

-- 3) Constraints: ensure mutually exclusive targeting
-- Interest mode requires interest_id, forbids course/semester
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_interest_mode_check'
  ) THEN
    ALTER TABLE companies
    ADD CONSTRAINT companies_interest_mode_check
    CHECK (
      (targeting_mode = 'interest' AND interest_id IS NOT NULL AND course_id IS NULL AND semester IS NULL)
      OR targeting_mode <> 'interest'
    );
  END IF;
END$$;

-- Course-semester mode requires course_id and semester, forbids interest_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_course_semester_mode_check'
  ) THEN
    ALTER TABLE companies
    ADD CONSTRAINT companies_course_semester_mode_check
    CHECK (
      (targeting_mode = 'course_semester' AND course_id IS NOT NULL AND semester IS NOT NULL AND semester > 0)
      OR targeting_mode <> 'course_semester'
    );
  END IF;
END$$;

-- 4) Helpful index for course-semester lookup
CREATE INDEX IF NOT EXISTS idx_companies_course_semester ON companies (course_id, semester) WHERE targeting_mode = 'course_semester';
