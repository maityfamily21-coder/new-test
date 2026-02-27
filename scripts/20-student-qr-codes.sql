-- Create table to store unique QR tokens for each student
CREATE TABLE IF NOT EXISTS student_qr_tokens (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_student_qr_tokens_token ON student_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_student_qr_tokens_student_id ON student_qr_tokens(student_id);

-- Create table to track student QR attendance (separate from seminar attendance)
CREATE TABLE IF NOT EXISTS student_qr_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  device_fingerprint TEXT,
  device_key TEXT,
  device_group TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for attendance tracking
CREATE INDEX IF NOT EXISTS idx_student_qr_attendance_student_id ON student_qr_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_qr_attendance_date ON student_qr_attendance(attendance_date);
