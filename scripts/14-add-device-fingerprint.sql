-- add device_fingerprint and a unique index per seminar to enforce one physical device
ALTER TABLE seminar_qr_submissions
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_seminar_device_fingerprint
  ON seminar_qr_submissions (seminar_id, device_fingerprint)
  WHERE device_fingerprint IS NOT NULL;
