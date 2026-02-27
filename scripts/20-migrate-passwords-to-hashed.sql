-- New migration script: Add support for hashed passwords
-- This script adds a new column for hashed passwords and prepares for migration
-- DO NOT run this yet - it's a template for gradual migration

-- Step 1: Add new columns for hashed passwords (non-breaking)
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE technical_team_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE peon_housekeeping_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE administrative_personnel ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 2: Add migration status tracking
CREATE TABLE IF NOT EXISTS password_migration_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL,
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, user_id)
);

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_password_hash ON students(password_hash) WHERE password_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admins_password_hash ON admins(password_hash) WHERE password_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tutors_password_hash ON tutors(password_hash) WHERE password_hash IS NOT NULL;

-- Note: The actual migration will happen gradually:
-- 1. New users will get hashed passwords directly
-- 2. Existing users will have passwords hashed on next login
-- 3. Old 'password' column will be kept for backward compatibility during transition
-- 4. After all users migrated, we can drop the 'password' column
