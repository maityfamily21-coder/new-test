-- Create seminar_students table to track seminars created for specific students
CREATE TABLE IF NOT EXISTS seminar_students (
  id SERIAL PRIMARY KEY,
  seminar_id INTEGER NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(seminar_id, student_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seminar_students_seminar_id ON seminar_students(seminar_id);
CREATE INDEX IF NOT EXISTS idx_seminar_students_student_id ON seminar_students(student_id);
