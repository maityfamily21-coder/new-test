-- Online Payment Tracking Table
CREATE TABLE IF NOT EXISTS online_fee_payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(50) NOT NULL,
  semester INT NOT NULL,
  fee_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED
  reference_id VARCHAR(100) UNIQUE NOT NULL,
  transaction_id VARCHAR(100),
  bank_ref_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_semester (student_id, semester),
  INDEX idx_reference (reference_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend fee_payments table to track online vs manual payments
ALTER TABLE fee_payments 
ADD COLUMN IF NOT EXISTS payment_source VARCHAR(50) DEFAULT 'Manual', 
ADD COLUMN IF NOT EXISTS online_payment_id BIGINT,
ADD FOREIGN KEY (online_payment_id) REFERENCES online_fee_payments(id) ON DELETE SET NULL;

-- Create index for payment source
CREATE INDEX IF NOT EXISTS idx_payment_source ON fee_payments(payment_source);

-- View for online payments summary
CREATE OR REPLACE VIEW online_payments_summary AS
SELECT 
  ofp.student_id,
  ofp.semester,
  ofp.fee_type,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN ofp.status = 'SUCCESS' THEN 1 ELSE 0 END) as successful_payments,
  SUM(CASE WHEN ofp.status = 'FAILED' THEN 1 ELSE 0 END) as failed_payments,
  SUM(CASE WHEN ofp.status = 'PENDING' THEN 1 ELSE 0 END) as pending_payments,
  SUM(ofp.amount) as total_amount,
  MAX(ofp.updated_at) as last_attempt
FROM online_fee_payments ofp
GROUP BY ofp.student_id, ofp.semester, ofp.fee_type;
