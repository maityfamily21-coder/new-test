-- Add image_url column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN messages.image_url IS 'Optional URL to an image to display with the message';
COMMENT ON COLUMN companies.image_url IS 'Optional URL to an image to display with the job opening';
