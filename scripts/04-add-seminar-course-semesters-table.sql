-- Create table to store course-semester combinations for seminars
CREATE TABLE IF NOT EXISTS seminar_course_semesters (
    id SERIAL PRIMARY KEY,
    seminar_id INTEGER NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seminar_id, course_id, semester)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_seminar_course_semesters_lookup 
ON seminar_course_semesters(course_id, semester);

CREATE INDEX IF NOT EXISTS idx_seminar_course_semesters_seminar 
ON seminar_course_semesters(seminar_id);
