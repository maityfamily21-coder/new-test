-- Drop the old constraint that allows only one per day
ALTER TABLE tutor_attendance DROP CONSTRAINT one_attendance_per_day;

-- Add columns for multi-attendance tracking and device validation
ALTER TABLE tutor_attendance ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) DEFAULT 'entry'; -- 'entry' or 'exit'
ALTER TABLE tutor_attendance ADD COLUMN IF NOT EXISTS campus_location VARCHAR(50) DEFAULT 'Campus 1';
ALTER TABLE tutor_attendance ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);
ALTER TABLE tutor_attendance ADD COLUMN IF NOT EXISTS browser_fingerprint TEXT;
ALTER TABLE tutor_attendance ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC;
ALTER TABLE tutor_attendance ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE;

-- Create a new unique constraint allowing 2 per day but preventing duplicate device usage per day
ALTER TABLE tutor_attendance ADD CONSTRAINT unique_device_per_day UNIQUE(tutor_id, attendance_date, device_id);

-- Create device tracking table
CREATE TABLE IF NOT EXISTS tutor_devices (
  id BIGSERIAL PRIMARY KEY,
  tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  device_name TEXT,
  browser_fingerprint TEXT,
  user_agent TEXT,
  first_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tutor_device UNIQUE(tutor_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_devices_tutor_id ON tutor_devices(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_devices_device_id ON tutor_devices(device_id);

-- Create attendance history view
CREATE OR REPLACE VIEW tutor_attendance_history AS
SELECT 
  ta.id,
  ta.tutor_id,
  ta.attendance_date,
  ta.marked_at,
  ta.latitude,
  ta.longitude,
  ta.attendance_type,
  ta.campus_location,
  ta.device_id,
  ta.location_accuracy,
  ta.location_verified,
  ta.created_at,
  ROW_NUMBER() OVER (PARTITION BY ta.tutor_id, ta.attendance_date ORDER BY ta.marked_at) as mark_number
FROM tutor_attendance ta
ORDER BY ta.attendance_date DESC, ta.marked_at DESC;

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_type ON tutor_attendance(attendance_type);
CREATE INDEX IF NOT EXISTS idx_campus_location ON tutor_attendance(campus_location);
CREATE INDEX IF NOT EXISTS idx_device_id ON tutor_attendance(device_id);
CREATE INDEX IF NOT EXISTS idx_location_verified ON tutor_attendance(location_verified);
