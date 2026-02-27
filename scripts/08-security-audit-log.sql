-- Create audit log table to track security events
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'login_attempt', 'unauthorized_access', 'data_access'
    user_type VARCHAR(20) NOT NULL, -- 'student', 'admin'
    user_id INTEGER,
    enrollment_number VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    requested_resource TEXT,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON security_audit_log(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_enrollment ON security_audit_log(enrollment_number);

-- Insert sample security events for monitoring
INSERT INTO security_audit_log (event_type, user_type, enrollment_number, success, error_message) VALUES
('system_security_update', 'system', 'SYSTEM', TRUE, 'Implemented server-side authentication and authorization checks'),
('vulnerability_fix', 'system', 'SYSTEM', TRUE, 'Fixed unauthorized data access vulnerability in student API routes');
