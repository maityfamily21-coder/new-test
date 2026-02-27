-- Add role and course assignments to admins table to support course-specific admins

-- Add role column to admins table (super_admin or course_admin)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'course_admin'));

-- Create admin course assignments table for course admins
CREATE TABLE IF NOT EXISTS admin_course_assignments (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id, course_id)
);

-- Update existing admins to be super_admin
UPDATE admins SET role = 'super_admin' WHERE role IS NULL;
