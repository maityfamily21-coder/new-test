-- Create technical_team_users table
CREATE TABLE IF NOT EXISTS technical_team_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pc_requests table for tracking PC setup requests from students
CREATE TABLE IF NOT EXISTS pc_requests (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, subject_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pc_requests_exam ON pc_requests(exam_id);
CREATE INDEX IF NOT EXISTS idx_pc_requests_subject ON pc_requests(subject_id);
CREATE INDEX IF NOT EXISTS idx_pc_requests_student ON pc_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_pc_requests_exam_subject ON pc_requests(exam_id, subject_id);
