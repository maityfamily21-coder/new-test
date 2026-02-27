-- 0) Drop legacy constraint first so upcoming updates won't violate it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_course_semester_mode_check'
  ) THEN
    ALTER TABLE companies DROP CONSTRAINT companies_course_semester_mode_check;
  END IF;
END$$;

-- 1) Create mapping table for company course-semester targets
CREATE TABLE IF NOT EXISTS company_course_semesters (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, course_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_company_course_semesters_lookup
ON company_course_semesters(course_id, semester);

CREATE INDEX IF NOT EXISTS idx_company_course_semesters_company
ON company_course_semesters(company_id);

-- 2) Backfill mapping table from existing single-target openings
INSERT INTO company_course_semesters (company_id, course_id, semester)
SELECT c.id, c.course_id, c.semester
FROM companies c
WHERE c.targeting_mode = 'course_semester'
  AND c.course_id IS NOT NULL
  AND c.semester IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) Null out legacy columns after dropping the old constraint
UPDATE companies
SET course_id = NULL,
    semester = NULL
WHERE targeting_mode = 'course_semester';

-- Also ensure interest_id is NULL for course_semester mode to match new rule
UPDATE companies
SET interest_id = NULL
WHERE targeting_mode = 'course_semester'
  AND interest_id IS NOT NULL;

-- 4) Add the new permissive constraint as NOT VALID
-- This enforces the rule for new/updated rows while allowing existing rows to remain as-is.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_course_semester_mode_check_v2'
  ) THEN
    ALTER TABLE companies
    ADD CONSTRAINT companies_course_semester_mode_check_v2
    CHECK (
      (targeting_mode = 'course_semester' AND interest_id IS NULL)
      OR targeting_mode <> 'course_semester'
    ) NOT VALID;
  END IF;
END$$;
