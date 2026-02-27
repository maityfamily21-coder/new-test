-- Create personnel_attendance table for admin, peon, and technical staff attendance marking
-- This is separate from tutor_attendance as it tracks all personnel types
CREATE TABLE IF NOT EXISTS personnel_attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL, -- 'admin', 'peon', 'technical'
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
CREATE INDEX IF NOT EXISTS idx_personnel_attendance_user_date 
ON personnel_attendance(user_id, user_type, attendance_date);

CREATE INDEX IF NOT EXISTS idx_personnel_attendance_device_date 
ON personnel_attendance(device_fingerprint, attendance_date);

CREATE INDEX IF NOT EXISTS idx_personnel_attendance_marked_at 
ON personnel_attendance(marked_at DESC);

CREATE INDEX IF NOT EXISTS idx_personnel_attendance_user_type 
ON personnel_attendance(user_type);

-- Ensure tutor_attendance table has same structure if not already present
-- This handles the case where tutor attendance needs to be consistent
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tutor_attendance'
  ) THEN
    CREATE TABLE tutor_attendance (
      id SERIAL PRIMARY KEY,
      tutor_id INTEGER NOT NULL,
      attendance_date DATE NOT NULL,
      marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      device_fingerprint VARCHAR(255) NOT NULL,
      campus_location VARCHAR(255),
      attendance_type VARCHAR(20) DEFAULT 'Entry',
      user_agent TEXT,
      ip_address INET,
      location_verified BOOLEAN DEFAULT false,
      status VARCHAR(50) DEFAULT 'present',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX idx_tutor_attendance_tutor_id ON tutor_attendance(tutor_id);
    CREATE INDEX idx_tutor_attendance_date ON tutor_attendance(attendance_date);
  END IF;
END $$;
