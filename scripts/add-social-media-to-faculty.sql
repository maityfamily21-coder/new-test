-- Add social media columns to faculty table
ALTER TABLE faculty
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN faculty.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN faculty.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN faculty.whatsapp_number IS 'WhatsApp contact number with country code';
