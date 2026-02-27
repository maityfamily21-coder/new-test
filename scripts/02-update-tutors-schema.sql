-- Added username and faculty_type columns to tutors table
-- Set default username for existing tutors to their names (lowercase, space replaced with underscore)
-- Set default faculty_type for existing tutors to 'Inhouse'

ALTER TABLE tutors ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS faculty_type VARCHAR(100) DEFAULT 'Inhouse';

-- Initialize username for existing tutors who don't have one
UPDATE tutors 
SET username = LOWER(REPLACE(name, ' ', '_')) 
WHERE username IS NULL;

-- Make username NOT NULL after initialization
ALTER TABLE tutors ALTER COLUMN username SET NOT NULL;
