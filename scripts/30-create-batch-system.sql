-- Batch System Migration
-- Description: Creates tables and schema for managing student batches within courses
-- Date: 2025-01-03
-- Impact: Non-breaking change - all new functionality, batch columns are nullable

-- Create batches table for storing batch configurations
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  batch_name VARCHAR(255) NOT NULL,
  description TEXT,
  batch_number INTEGER NOT NULL,
  total_students INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, semester, batch_number)
);

-- Create batch_students junction table for student-batch assignments
CREATE TABLE IF NOT EXISTS batch_students (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(batch_id, student_id)
);

-- Add batch_id column to lectures table
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_batch_students_batch_id ON batch_students(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_students_student_id ON batch_students(student_id);
CREATE INDEX IF NOT EXISTS idx_batches_course_semester ON batches(course_id, semester);
CREATE INDEX IF NOT EXISTS idx_lectures_batch_id ON lectures(batch_id);

-- This migration enables:
-- 1. Course-semester based batch creation
-- 2. Student assignment to specific batches
-- 3. Batch-specific lecture creation and attendance
-- 4. Conditional batch selection in tutor lecture flow
