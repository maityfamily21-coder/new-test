-- Update or create tutor_attendance table with all required columns for location-based attendance
-- This ensures consistency with the attendance API endpoints
CREATE TABLE IF NOT EXISTS tutor_attendance (
  id SERIAL PRIMARY KEY,
  tutor_id INTEGER NOT NULL,
  attendance_date DATE NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  campus_location VARCHAR(255),
  attendance_type VARCHAR(20) DEFAULT 'Entry', -- 'Entry' or 'Exit'
  user_agent TEXT,
  ip_address INET,
  location_verified BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'present', -- 'present', 'absent', 'late'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_tutor_attendance_tutor_id ON tutor_attendance(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_attendance_date ON tutor_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_tutor_attendance_tutor_date ON tutor_attendance(tutor_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_tutor_attendance_device_date ON tutor_attendance(device_fingerprint, attendance_date);
CREATE INDEX IF NOT EXISTS idx_tutor_attendance_marked_at ON tutor_attendance(marked_at DESC);

-- Safely add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add campus_location if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tutor_attendance' AND column_name = 'campus_location'
  ) THEN
    ALTER TABLE tutor_attendance ADD COLUMN campus_location VARCHAR(255);
  END IF;

  -- Add attendance_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tutor_attendance' AND column_name = 'attendance_type'
  ) THEN
    ALTER TABLE tutor_attendance ADD COLUMN attendance_type VARCHAR(20) DEFAULT 'Entry';
  END IF;

  -- Add location_verified if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tutor_attendance' AND column_name = 'location_verified'
  ) THEN
    ALTER TABLE tutor_attendance ADD COLUMN location_verified BOOLEAN DEFAULT false;
  END IF;
END $$;
