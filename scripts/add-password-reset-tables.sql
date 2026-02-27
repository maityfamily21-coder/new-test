-- Add password reset support tables for all user types
-- This migration creates the infrastructure for forgot password functionality

-- Table 1: Password reset tokens with OTP
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER,
  user_type VARCHAR(50) NOT NULL, -- 'student', 'admin', 'tutor', 'technical', 'administrative_personnel', 'accounts_personnel', 'peon', 'course_admin'
  otp VARCHAR(10) NOT NULL,
  otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  identity_field VARCHAR(50) NOT NULL, -- 'enrollment_number', 'username', etc.
  identity_value VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'used'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Password reset attempt tracking for rate limiting
CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_type VARCHAR(50) NOT NULL,
  identity_value VARCHAR(255) NOT NULL,
  ip_address INET,
  attempt_type VARCHAR(50), -- 'otp_request', 'otp_verify', 'password_reset'
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Audit log for password reset operations
CREATE TABLE IF NOT EXISTS password_reset_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_type VARCHAR(50) NOT NULL,
  user_id INTEGER,
  identity_value VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'otp_requested', 'otp_verified', 'password_reset', 'otp_expired'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_identity_value ON password_reset_tokens(identity_value);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_otp ON password_reset_tokens(otp);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_status ON password_reset_tokens(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_created_at ON password_reset_tokens(created_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_identity_value ON password_reset_attempts(identity_value, created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip_address ON password_reset_attempts(ip_address, created_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_audit_log_user_id ON password_reset_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_audit_log_identity_value ON password_reset_audit_log(identity_value);
CREATE INDEX IF NOT EXISTS idx_password_reset_audit_log_created_at ON password_reset_audit_log(created_at);

-- Add password_reset_status column to user tables if not exists
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_reset_status VARCHAR(20) DEFAULT 'none'; -- 'none', 'recently_reset'
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_reset_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS password_reset_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE technical_team_users ADD COLUMN IF NOT EXISTS password_reset_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE administrative_personnel ADD COLUMN IF NOT EXISTS password_reset_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE peon_housekeeping_users ADD COLUMN IF NOT EXISTS password_reset_status VARCHAR(20) DEFAULT 'none';

-- Optional: Add last_password_change_date tracking (useful for security policies)
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_password_change_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_password_change_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS last_password_change_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE technical_team_users ADD COLUMN IF NOT EXISTS last_password_change_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE administrative_personnel ADD COLUMN IF NOT EXISTS last_password_change_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE peon_housekeeping_users ADD COLUMN IF NOT EXISTS last_password_change_date TIMESTAMP WITH TIME ZONE;
