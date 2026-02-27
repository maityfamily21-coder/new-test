-- 1) Extend targeting_mode to include 'students'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='targeting_mode') THEN
    BEGIN
      -- Allow 'students' in targeting_mode
      ALTER TABLE companies
        DROP CONSTRAINT IF EXISTS companies_targeting_mode_check;
      ALTER TABLE companies
        ADD CONSTRAINT companies_targeting_mode_check
        CHECK (targeting_mode IN ('interest','course_semester','students'));
    EXCEPTION
      WHEN undefined_object THEN
        -- if the named constraint didn't exist just continue
        NULL;
    END;
  END IF;
END$$;

-- 2) Keep mutual exclusivity constraints, extend to 'students' case
-- Interest mode requires interest_id, forbids course/semester
ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_interest_mode_check;
ALTER TABLE companies
  ADD CONSTRAINT companies_interest_mode_check
  CHECK (
    (targeting_mode = 'interest' AND interest_id IS NOT NULL AND course_id IS NULL AND semester IS NULL)
    OR targeting_mode <> 'interest'
  );

-- Course-semester mode requires course_id & semester, forbids interest_id
ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_course_semester_mode_check;
ALTER TABLE companies
  ADD CONSTRAINT companies_course_semester_mode_check
  CHECK (
    (targeting_mode = 'course_semester' AND course_id IS NOT NULL AND semester IS NOT NULL AND semester > 0 AND interest_id IS NULL)
    OR targeting_mode <> 'course_semester'
  );

-- Students mode forbids all three (interest/course/semester) and uses recipients table
ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_students_mode_check;
ALTER TABLE companies
  ADD CONSTRAINT companies_students_mode_check
  CHECK (
    (targeting_mode = 'students' AND interest_id IS NULL AND course_id IS NULL AND semester IS NULL)
    OR targeting_mode <> 'students'
  );

-- 3) Create recipient mapping for student-targeted openings
CREATE TABLE IF NOT EXISTS company_recipients (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_company_recipients_company ON company_recipients (company_id);
CREATE INDEX IF NOT EXISTS idx_company_recipients_student ON company_recipients (student_id);
