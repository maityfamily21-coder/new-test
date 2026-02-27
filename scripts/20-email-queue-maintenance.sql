ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_email_queue_status_next_attempt
  ON email_queue (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_updated
  ON email_queue (status, updated_at DESC);
