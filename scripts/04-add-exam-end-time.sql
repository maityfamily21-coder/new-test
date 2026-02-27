-- Add exam_end_time column to exam_subjects table
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS exam_end_time VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_end_time ON exam_subjects(exam_end_time);
