-- Add constraints and triggers for exam management

-- Create trigger to update exam updated_at timestamp
CREATE OR REPLACE FUNCTION update_exam_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exam_update_timestamp
BEFORE UPDATE ON exams
FOR EACH ROW
EXECUTE FUNCTION update_exam_timestamp();

-- Create trigger to update exam_attendance updated_at timestamp
CREATE TRIGGER exam_attendance_update_timestamp
BEFORE UPDATE ON exam_attendance
FOR EACH ROW
EXECUTE FUNCTION update_exam_timestamp();
