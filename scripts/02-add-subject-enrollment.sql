-- Create student_subjects table to track which subjects students are enrolled in
-- This helps filter students by subject for exam attendance
CREATE TABLE IF NOT EXISTS student_subjects (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, subject_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);

-- Populate initial data: link students to subjects based on course and semester match
-- This assumes students should have all subjects in their current semester
INSERT INTO student_subjects (student_id, subject_id)
SELECT DISTINCT s.id, sub.id
FROM students s
JOIN subjects sub ON s.course_id = sub.course_id AND s.current_semester = sub.semester
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects 
  WHERE student_id = s.id AND subject_id = sub.id
)
ON CONFLICT (student_id, subject_id) DO NOTHING;
