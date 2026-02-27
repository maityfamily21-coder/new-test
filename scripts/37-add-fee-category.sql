-- Add fee_category column to students table for student classification
ALTER TABLE students ADD COLUMN fee_category VARCHAR(20) DEFAULT 'GENERAL';

-- Add CHECK constraint to allow only valid fee categories
ALTER TABLE students ADD CONSTRAINT fee_category_check 
CHECK (fee_category IN ('GENERAL', 'FREESHIP', 'SCHOLARSHIP', 'EWS'));

-- Create index for efficient filtering by fee_category
CREATE INDEX idx_students_fee_category ON students(fee_category);