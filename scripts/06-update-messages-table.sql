-- Add course_id and semester columns to messages table if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='course_id') THEN
        ALTER TABLE messages ADD COLUMN course_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='semester') THEN
        ALTER TABLE messages ADD COLUMN semester INTEGER;
    END IF;
END $$;

-- Update existing rows to satisfy the new check constraint before adding it
-- Similar logic as seminars: ensure consistency for existing data.
UPDATE messages
SET course_id = NULL, semester = NULL
WHERE interest_id IS NOT NULL AND (course_id IS NOT NULL OR semester IS NOT NULL);

-- Add foreign key constraint for course_id if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_course') THEN
        ALTER TABLE messages ADD CONSTRAINT fk_messages_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint to ensure either interest_id is set OR (course_id AND semester are set), but not both
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_target') THEN
        ALTER TABLE messages ADD CONSTRAINT chk_message_target CHECK (
            (interest_id IS NOT NULL AND course_id IS NULL AND semester IS NULL) OR
            (interest_id IS NULL AND course_id IS NOT NULL AND semester IS NOT NULL)
        );
    END IF;
END $$;

-- Add index for course_id and semester for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_course_semester ON messages (course_id, semester);
