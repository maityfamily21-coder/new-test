-- Create default accounts personnel user
-- Username: accounts
-- Password: accounts123
-- IMPORTANT: Change this password after first login!

-- First, delete any existing accounts user to ensure clean setup
DELETE FROM administrative_personnel WHERE username = 'accounts';

-- Insert with plain text password (matching admin table pattern)
INSERT INTO administrative_personnel (name, email, username, password, is_active)
VALUES (
  'Accounts Personnel',
  'accounts@gucpc.edu',
  'accounts',
  'accounts123',
  TRUE
);

COMMENT ON TABLE administrative_personnel IS 'Accounts personnel and administrative staff with access to fees management';
