-- Create leave management tables for tutors, technical team, and admin personnel

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('tutor', 'technical', 'admin_personnel')),
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('sick', 'casual', 'emergency', 'personal', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'forwarded', 'approved', 'rejected')),
  reviewed_by_course_admin_id INTEGER, -- For tutor leaves only
  reviewed_by_course_admin_at TIMESTAMP,
  reviewed_by_super_admin_id INTEGER,
  reviewed_by_super_admin_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave balance table (12 leaves per year by default)
CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('tutor', 'technical', 'admin_personnel')),
  year INTEGER NOT NULL,
  total_leaves INTEGER DEFAULT 12,
  used_leaves INTEGER DEFAULT 0,
  remaining_leaves INTEGER DEFAULT 12,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, user_type, year)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON leave_balances(user_id, user_type, year);

-- Insert default leave balances for existing users
INSERT INTO leave_balances (user_id, user_type, year)
SELECT id, 'tutor', EXTRACT(YEAR FROM CURRENT_DATE)
FROM tutors
ON CONFLICT (user_id, user_type, year) DO NOTHING;

INSERT INTO leave_balances (user_id, user_type, year)
SELECT id, 'technical', EXTRACT(YEAR FROM CURRENT_DATE)
FROM technical_team_users
ON CONFLICT (user_id, user_type, year) DO NOTHING;

INSERT INTO leave_balances (user_id, user_type, year)
SELECT id, 'admin_personnel', EXTRACT(YEAR FROM CURRENT_DATE)
FROM administrative_personnel
ON CONFLICT (user_id, user_type, year) DO NOTHING;
