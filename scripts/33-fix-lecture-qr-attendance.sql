-- Fix lecture QR attendance system
-- This script ensures the lecture_attendance table has the correct structure for QR-based marking

-- Ensure lecture_attendance table exists with correct schema
CREATE TABLE IF NOT EXISTS lecture_attendance (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late')),
  marked_by_tutor_id INTEGER REFERENCES tutors(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lecture_attendance_lecture ON lecture_attendance(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_attendance_student ON lecture_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_lecture_attendance_created ON lecture_attendance(created_at);

-- Ensure lecture_qr_tokens table exists
CREATE TABLE IF NOT EXISTS lecture_qr_tokens (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_lecture_qr_tokens_token ON lecture_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_lecture_qr_tokens_lecture ON lecture_qr_tokens(lecture_id);
