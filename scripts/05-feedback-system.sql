-- Tutor Feedback System Tables
-- Create feedback_settings table for tracking feedback period
CREATE TABLE IF NOT EXISTS feedback_settings (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT NULL,
    ended_at TIMESTAMP DEFAULT NULL,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tutor_feedback table to store student feedback
CREATE TABLE IF NOT EXISTS tutor_feedback (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    tutor_id INT NOT NULL,
    subject_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, tutor_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Create feedback_analytics view for performance
CREATE OR REPLACE VIEW feedback_summary AS
SELECT 
    tf.tutor_id,
    t.name as tutor_name,
    s.name as subject_name,
    COUNT(DISTINCT tf.student_id) as total_feedback_count,
    AVG(tf.rating) as average_rating,
    COUNT(DISTINCT CASE WHEN tf.rating >= 4 THEN tf.student_id END) as positive_feedback_count,
    ROUND(AVG(tf.rating)::numeric, 2) as avg_rating_rounded
FROM tutor_feedback tf
JOIN tutors t ON tf.tutor_id = t.id
JOIN subjects s ON tf.subject_id = s.id
GROUP BY tf.tutor_id, t.name, s.name;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tutor_feedback_student ON tutor_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_feedback_tutor ON tutor_feedback(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_feedback_subject ON tutor_feedback(subject_id);
CREATE INDEX IF NOT EXISTS idx_tutor_feedback_unique ON tutor_feedback(student_id, tutor_id, subject_id);
