-- Add support for multiple tutors per lecture and track attendance marking tutor

-- 1. Create a junction table for co-teaching (lectures <-> tutors)
CREATE TABLE IF NOT EXISTS lecture_tutors (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  is_creator BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_id, tutor_id)
);

-- 2. Add marker tracking to attendance
ALTER TABLE lecture_attendance 
ADD COLUMN IF NOT EXISTS marked_by_tutor_id INTEGER REFERENCES tutors(id);

-- 3. Migrate existing lecture creator data to the new junction table
INSERT INTO lecture_tutors (lecture_id, tutor_id, is_creator)
SELECT id, tutor_id, TRUE FROM lectures
ON CONFLICT (lecture_id, tutor_id) DO NOTHING;

-- 4. Create indexes for efficient shared access
CREATE INDEX IF NOT EXISTS idx_lecture_tutors_lecture ON lecture_tutors(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_tutors_tutor ON lecture_tutors(tutor_id);
CREATE INDEX IF NOT EXISTS idx_lecture_attendance_marker ON lecture_attendance(marked_by_tutor_id);

-- 5. Note: We keep tutor_id in lectures table for backward compatibility/legacy creator tracking, 
-- but newly created lectures will primarily use lecture_tutors for shared access.
