-- Add seminar ratings functionality
-- This allows students who attended seminars to rate them from 1-5 stars

CREATE TABLE IF NOT EXISTS seminar_ratings (
    id SERIAL PRIMARY KEY,
    seminar_id INTEGER REFERENCES seminars(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seminar_id, student_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seminar_ratings_seminar_id ON seminar_ratings(seminar_id);
CREATE INDEX IF NOT EXISTS idx_seminar_ratings_student_id ON seminar_ratings(student_id);
CREATE INDEX IF NOT EXISTS idx_seminar_ratings_rating ON seminar_ratings(rating);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seminar_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seminar_ratings_updated_at
    BEFORE UPDATE ON seminar_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_seminar_ratings_updated_at();
