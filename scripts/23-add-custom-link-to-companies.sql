-- Add custom_link column to companies table for job opening links
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS custom_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.custom_link IS 'Custom link provided by admin for job opening (e.g., application form, job details page)';
