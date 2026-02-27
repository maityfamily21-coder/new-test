-- Add unique_code column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS unique_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_unique_code ON students(unique_code);
