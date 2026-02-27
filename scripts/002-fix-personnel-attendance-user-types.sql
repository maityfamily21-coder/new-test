-- Fix the personnel_attendance table to support the actual user types used in the application
-- User types: admin_personnel, accounts_personnel, technical_team, peon

-- Drop the old constraint
ALTER TABLE personnel_attendance 
DROP CONSTRAINT check_valid_user_type;

-- Add the new constraint with the correct user types
ALTER TABLE personnel_attendance 
ADD CONSTRAINT check_valid_user_type 
  CHECK (user_type IN ('admin_personnel', 'accounts_personnel', 'technical_team', 'peon'));
