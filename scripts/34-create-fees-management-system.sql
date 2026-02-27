-- Fees Management System Database Schema
-- This script creates tables for managing student fees, payments, and accounts personnel

-- Table to store fee structure for each course-semester combination
CREATE TABLE IF NOT EXISTS fee_structure (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester > 0),
    semester_fee DECIMAL(10, 2) NOT NULL CHECK (semester_fee >= 0),
    exam_fee DECIMAL(10, 2) NOT NULL CHECK (exam_fee >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, semester)
);

-- Table to store fee payment transactions
CREATE TABLE IF NOT EXISTS fee_payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL CHECK (semester > 0),
    fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('semester', 'exam', 'both')),
    amount_paid DECIMAL(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    accounts_personnel_id INTEGER REFERENCES administrative_personnel(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_fee_structure_course_semester ON fee_structure(course_id, semester);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_transaction ON fee_payments(transaction_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fee_structure_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER fee_structure_updated_at_trigger
    BEFORE UPDATE ON fee_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_fee_structure_updated_at();

-- Insert default fee structures for existing courses (optional - commented out)
-- Uncomment and modify as needed for your institution
-- INSERT INTO fee_structure (course_id, semester, semester_fee, exam_fee)
-- SELECT id, generate_series(1, total_semesters), 0, 0
-- FROM courses
-- ON CONFLICT (course_id, semester) DO NOTHING;
