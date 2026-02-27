-- Ensure admin table exists and has correct data
DELETE FROM admins WHERE username = 'admin';

-- Removed name and email columns that don't exist in the admins table
INSERT INTO admins (username, password) VALUES 
('admin', '9909');
INSERT INTO admins (username, password) VALUES 
('Simon', '9909');

-- Verify the admin record
SELECT * FROM admins WHERE username = 'admin';
