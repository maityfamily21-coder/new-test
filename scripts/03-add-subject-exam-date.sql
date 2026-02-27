-- Add exam_date column to exam_subjects table to store individual subject exam dates
ALTER TABLE exam_subjects 
ADD COLUMN IF NOT EXISTS exam_date VARCHAR(50);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_date ON exam_subjects(exam_date);
