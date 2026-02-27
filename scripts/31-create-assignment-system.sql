-- Assignment Management System Migration
-- Description: Creates tables for assignment creation, submission, and marks tracking
-- Date: 2025-01-13
-- Impact: Non-breaking change - new functionality, fully backward compatible

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_marks INTEGER NOT NULL DEFAULT 100,
  status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Ended')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create assignment_marks table for storing marks for each student
CREATE TABLE IF NOT EXISTS assignment_marks (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(5, 2),
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tutor_id ON assignments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_marks_assignment_id ON assignment_marks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_marks_student_id ON assignment_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_marks_submitted ON assignment_marks(submitted_at);

-- This migration enables:
-- 1. Tutors to create assignments for their subjects
-- 2. Tracking of assignment status (Active/Ended)
-- 3. Recording of student marks for each assignment
-- 4. Unique constraint to ensure one marks entry per student per assignment
-- 5. Timestamps for audit trail
