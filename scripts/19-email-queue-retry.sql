ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- prioritize due items efficiently
CREATE INDEX IF NOT EXISTS idx_email_queue_status_next_attempt
  ON email_queue (status, next_attempt_at, created_at DESC);

-- backfill protection (if any nulls exist from older data)
UPDATE email_queue
SET next_attempt_at = NOW()
WHERE next_attempt_at IS NULL;

-- revive previously failed emails so they get retried automatically
UPDATE email_queue
SET status = 'pending', next_attempt_at = NOW(), updated_at = NOW()
WHERE status = 'failed';
