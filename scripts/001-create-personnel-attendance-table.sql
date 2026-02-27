-- Create personnel_attendance table for tracking staff/personnel attendance
CREATE TABLE IF NOT EXISTS personnel_attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL, -- 'admin', 'tutor', 'peon', 'technical'
  attendance_date DATE NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  device_fingerprint VARCHAR(255),
  campus_location VARCHAR(255),
  attendance_type VARCHAR(20) DEFAULT 'Entry', -- 'Entry' or 'Exit'
  user_agent TEXT,
  ip_address inet,
  location_verified BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'present', -- 'present', 'absent', 'late'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_personnel_attendance_user_date 
  ON personnel_attendance(user_id, user_type, attendance_date);

CREATE INDEX IF NOT EXISTS idx_personnel_attendance_device 
  ON personnel_attendance(device_fingerprint, attendance_date);

CREATE INDEX IF NOT EXISTS idx_personnel_attendance_marked_at 
  ON personnel_attendance(marked_at DESC);

-- Add constraint to ensure valid user types
ALTER TABLE personnel_attendance 
ADD CONSTRAINT check_valid_user_type 
  CHECK (user_type IN ('admin', 'tutor', 'peon', 'technical'));

-- Add constraint to ensure valid attendance types
ALTER TABLE personnel_attendance 
ADD CONSTRAINT check_valid_attendance_type 
  CHECK (attendance_type IN ('Entry', 'Exit'));
