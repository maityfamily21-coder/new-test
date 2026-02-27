-- Create Peon/Housekeeping Users Table
CREATE TABLE IF NOT EXISTS peon_housekeeping_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default peon user for testing
INSERT INTO peon_housekeeping_users (name, email, username, password, phone_number)
VALUES ('Peon User', 'peon@gucpc.in', 'peon', 'peon123', '9876543210')
ON CONFLICT (username) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_peon_username ON peon_housekeeping_users(username);
CREATE INDEX IF NOT EXISTS idx_peon_active ON peon_housekeeping_users(is_active);
