-- Create administrative_personnel table
CREATE TABLE IF NOT EXISTS administrative_personnel (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add column to exam_attendance to track who marked attendance
ALTER TABLE exam_attendance ADD COLUMN IF NOT EXISTS marked_by VARCHAR(50) DEFAULT 'admin';
ALTER TABLE exam_attendance ADD COLUMN IF NOT EXISTS marked_by_id INTEGER;
ALTER TABLE exam_attendance ADD COLUMN IF NOT EXISTS marked_by_type VARCHAR(50) DEFAULT 'admin';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_personnel_username ON administrative_personnel(username);
CREATE INDEX IF NOT EXISTS idx_exam_attendance_marked_by ON exam_attendance(marked_by_type, marked_by_id);
