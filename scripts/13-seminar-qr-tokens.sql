-- Create table to store unique QR tokens per seminar
CREATE TABLE IF NOT EXISTS seminar_qr_tokens (
  id SERIAL PRIMARY KEY,
  seminar_id INTEGER NOT NULL UNIQUE REFERENCES seminars(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful index for token lookup
CREATE INDEX IF NOT EXISTS idx_seminar_qr_tokens_token ON seminar_qr_tokens(token);
