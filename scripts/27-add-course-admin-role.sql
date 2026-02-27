-- Add role and course assignment fields to administrative_personnel table
ALTER TABLE administrative_personnel 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'super_admin',
ADD COLUMN IF NOT EXISTS assigned_course_ids INTEGER[] DEFAULT '{}';

-- Add constraint to ensure valid roles
ALTER TABLE administrative_personnel 
ADD CONSTRAINT check_personnel_role 
CHECK (role IN ('super_admin', 'course_admin', 'personnel'));

-- Create index for course-specific lookups
CREATE INDEX IF NOT EXISTS idx_admin_personnel_role ON administrative_personnel(role);
CREATE INDEX IF NOT EXISTS idx_admin_personnel_assigned_courses ON administrative_personnel USING GIN(assigned_course_ids);

-- Add audit columns for tracking course admin actions
ALTER TABLE security_audit_log 
ADD COLUMN IF NOT EXISTS accessed_course_id INTEGER,
ADD COLUMN IF NOT EXISTS admin_role VARCHAR(50);

-- Update existing administrative personnel to super_admin role
UPDATE administrative_personnel 
SET role = 'super_admin' 
WHERE role IS NULL OR role = '';

-- Update exam_marks_assignment to track which admin assigned tutors
ALTER TABLE exam_marks_assignment 
ADD COLUMN IF NOT EXISTS assigned_by_type VARCHAR(50) DEFAULT 'admin';

COMMENT ON COLUMN administrative_personnel.role IS 'User role: super_admin (full access), course_admin (course-specific access), personnel (limited permissions)';
COMMENT ON COLUMN administrative_personnel.assigned_course_ids IS 'Array of course IDs that this course admin can manage. Empty/null for super_admins.';
