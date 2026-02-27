-- Add course_id and semester columns to seminars table if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seminars' AND column_name='course_id') THEN
        ALTER TABLE seminars ADD COLUMN course_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seminars' AND column_name='semester') THEN
        ALTER TABLE seminars ADD COLUMN semester INTEGER;
    END IF;
END $$;

-- Update existing rows to satisfy the new check constraint before adding it
-- For any seminar that currently has neither interest_id nor course_id/semester set,
-- or has both, we need to make it consistent.
-- Assuming existing seminars are primarily interest-based if interest_id is not null.
-- If interest_id is null, and course_id/semester are also null, we might need to assign a default or handle.
-- For simplicity, let's ensure that if interest_id is NULL, then course_id and semester are also NULL,
-- or vice-versa, before applying the check constraint.
-- This update ensures that for existing rows, if interest_id is set, course_id and semester are null.
-- If interest_id is null, then course_id and semester should also be null (or set if they were intended to be).
-- For the purpose of this migration, we'll assume existing seminars without an interest_id
-- were not intended to be course-semester specific, so we'll ensure course_id and semester are null.
UPDATE seminars
SET course_id = NULL, semester = NULL
WHERE interest_id IS NOT NULL AND (course_id IS NOT NULL OR semester IS NOT NULL);

-- Add foreign key constraint for course_id if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seminars_course') THEN
        ALTER TABLE seminars ADD CONSTRAINT fk_seminars_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint to ensure either interest_id is set OR (course_id AND semester are set), but not both
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seminar_target') THEN
        ALTER TABLE seminars ADD CONSTRAINT chk_seminar_target CHECK (
            (interest_id IS NOT NULL AND course_id IS NULL AND semester IS NULL) OR
            (interest_id IS NULL AND course_id IS NOT NULL AND semester IS NOT NULL)
        );
    END IF;
END $$;

-- Add index for course_id and semester for faster lookups
CREATE INDEX IF NOT EXISTS idx_seminars_course_semester ON seminars (course_id, semester);
