-- 1) Mapping table to attach multiple Course–Semesters to a single message
CREATE TABLE IF NOT EXISTS message_course_semesters (
  id SERIAL PRIMARY KEY,
  message_id INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  course_id INT NOT NULL REFERENCES courses(id),
  semester INT NOT NULL CHECK (semester > 0),
  UNIQUE (message_id, course_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_message_course_semesters_message_id ON message_course_semesters (message_id);
CREATE INDEX IF NOT EXISTS idx_message_course_semesters_course_sem ON message_course_semesters (course_id, semester);

-- 2) Optional backfill for existing single-target course_semester messages
--    This does NOT merge old separate rows; it only ensures mapping exists per existing message row.
INSERT INTO message_course_semesters (message_id, course_id, semester)
SELECT m.id, m.course_id, m.semester
FROM messages m
LEFT JOIN message_course_semesters mcs
  ON mcs.message_id = m.id
  AND mcs.course_id = m.course_id
  AND mcs.semester = m.semester
WHERE m.message_type = 'course_semester'
  AND m.course_id IS NOT NULL
  AND m.semester IS NOT NULL
  AND mcs.id IS NULL;
