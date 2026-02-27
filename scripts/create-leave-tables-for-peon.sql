-- Ensure leave_balances table exists with correct structure
CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  total_leaves INTEGER DEFAULT 12,
  used_leaves INTEGER DEFAULT 0,
  remaining_leaves INTEGER DEFAULT 12,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, user_type, year)
);

-- Ensure leave_requests table exists with correct structure
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by_course_admin_id INTEGER,
  reviewed_by_course_admin_at TIMESTAMP,
  reviewed_by_super_admin_id INTEGER,
  reviewed_by_super_admin_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON leave_balances(user_id, user_type, year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
