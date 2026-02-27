-- Add speaker_name column to seminars table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seminars' AND column_name='speaker_name') THEN
        ALTER TABLE seminars ADD COLUMN speaker_name VARCHAR(255);
    END IF;
END $$;

-- Add index for speaker_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_seminars_speaker_name ON seminars (speaker_name);
