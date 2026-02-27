-- Update tutor_attendance table with all required columns for location-based attendance
-- This ensures consistency with the attendance API endpoints
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

  -- Ensure marked_at has proper type (update if needed)
  -- Note: This handles the case where column might exist but needs updating
  
  -- Create indexes if they don't exist
  CREATE INDEX IF NOT EXISTS idx_tutor_attendance_device_date 
  ON tutor_attendance(device_fingerprint, attendance_date);
  
  CREATE INDEX IF NOT EXISTS idx_tutor_attendance_marked_at 
  ON tutor_attendance(marked_at DESC);
  
END $$;

-- Drop the one_attendance_per_day constraint if it exists (allow multiple per day for entry/exit)
ALTER TABLE tutor_attendance DROP CONSTRAINT IF EXISTS one_attendance_per_day;
