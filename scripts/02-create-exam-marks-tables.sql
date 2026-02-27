-- Create exam_marks_assignment table (Tutor assignment for marks entry)
CREATE TABLE IF NOT EXISTS exam_marks_assignment (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  assigned_by_admin_id INTEGER REFERENCES administrative_personnel(id),
  assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, subject_id, tutor_id)
);

-- Create exam_marks table (Individual student marks per subject)
CREATE TABLE IF NOT EXISTS exam_marks (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  marks_obtained INTEGER,
  total_marks INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'submitted'
  submission_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id, subject_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_marks_assignment_exam ON exam_marks_assignment(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_assignment_tutor ON exam_marks_assignment(tutor_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_assignment_subject ON exam_marks_assignment(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_exam_student ON exam_marks(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_tutor ON exam_marks(tutor_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_subject ON exam_marks(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_status ON exam_marks(status);
