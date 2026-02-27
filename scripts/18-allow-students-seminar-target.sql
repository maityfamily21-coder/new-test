DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seminar_target') THEN
    ALTER TABLE seminars DROP CONSTRAINT chk_seminar_target;
  END IF;

  -- Re-add with third allowed case:
  -- 1) interest_id set (course_id, semester NULL)
  -- 2) course_id + semester set (interest_id NULL)
  -- 3) selected-students: all three NULL
  ALTER TABLE seminars ADD CONSTRAINT chk_seminar_target CHECK (
    (interest_id IS NOT NULL AND course_id IS NULL AND semester IS NULL) OR
    (interest_id IS NULL AND course_id IS NOT NULL AND semester IS NOT NULL) OR
    (interest_id IS NULL AND course_id IS NULL AND semester IS NULL)
  );
END
$$;
