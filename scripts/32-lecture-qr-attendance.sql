-- Create table to store unique QR tokens per lecture
CREATE TABLE IF NOT EXISTS lecture_qr_tokens (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP NULL
);

-- Helpful index for token lookup
CREATE INDEX IF NOT EXISTS idx_lecture_qr_tokens_token ON lecture_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_lecture_qr_tokens_lecture ON lecture_qr_tokens(lecture_id);

-- Track submissions to enforce one device/IP per lecture
CREATE TABLE IF NOT EXISTS lecture_qr_submissions (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  device_key TEXT,
  device_group TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_device
  ON lecture_qr_submissions(lecture_id, device_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_ip
  ON lecture_qr_submissions(lecture_id, ip_address)
  WHERE ip_address IS NOT NULL AND ip_address <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_fingerprint
  ON lecture_qr_submissions(lecture_id, device_fingerprint)
  WHERE device_fingerprint IS NOT NULL AND device_fingerprint <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_device_key
  ON lecture_qr_submissions(lecture_id, device_key)
  WHERE device_key IS NOT NULL AND device_key <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_device_group
  ON lecture_qr_submissions(lecture_id, device_group)
  WHERE device_group IS NOT NULL AND device_group <> '';

-- Session tracking for lecture QR attendance (temporary 20-second windows)
CREATE TABLE IF NOT EXISTS lecture_qr_sessions (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lecture_qr_sessions_lecture ON lecture_qr_sessions(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_qr_sessions_expires ON lecture_qr_sessions(expires_at);

-- Main attendance table for marking student attendance via QR code
CREATE TABLE IF NOT EXISTS lecture_attendance (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late')),
  marked_by_tutor_id INTEGER REFERENCES tutors(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lecture_attendance_lecture ON lecture_attendance(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_attendance_student ON lecture_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_lecture_attendance_created ON lecture_attendance(created_at);
