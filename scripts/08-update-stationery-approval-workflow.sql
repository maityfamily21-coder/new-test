-- Update stationery_requests table to support Course Admin approval workflow for tutors
-- Mirrors the Leave Management approval flow structure

-- Add new columns for tracking course admin and tech team approval
ALTER TABLE stationery_requests 
ADD COLUMN IF NOT EXISTS reviewed_by_course_admin_id INTEGER,
ADD COLUMN IF NOT EXISTS reviewed_by_course_admin_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by_technical_id INTEGER,
ADD COLUMN IF NOT EXISTS reviewed_by_technical_at TIMESTAMP WITH TIME ZONE;

-- Update status enum/check to support new workflow states
-- States: 'pending_approval' (waiting for course admin), 'forwarded' (forwarded by course admin to technical), 
--         'approved' (approved by technical team), 'rejected' (rejected at any stage)
-- Note: Some databases may not enforce CHECK constraints strongly; consider application-level validation

-- Add index for course admin reviews
CREATE INDEX IF NOT EXISTS idx_stationery_requests_course_admin_review ON stationery_requests(reviewed_by_course_admin_id);
CREATE INDEX IF NOT EXISTS idx_stationery_requests_technical_review ON stationery_requests(reviewed_by_technical_id);
CREATE INDEX IF NOT EXISTS idx_stationery_requests_requester_type ON stationery_requests(requester_type);
