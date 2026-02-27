-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  exam_name VARCHAR(255) NOT NULL,
  exam_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, semester, exam_name)
);

-- Create exam_subjects table (linking exams to subjects with marks)
CREATE TABLE IF NOT EXISTS exam_subjects (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_marks INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, subject_id)
);

-- Create exam_attendance table (QR-based attendance)
CREATE TABLE IF NOT EXISTS exam_attendance (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  attendance_status VARCHAR(50) DEFAULT 'absent', -- 'present' or 'absent'
  scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id, subject_id)
);

-- Create exam_qr_tokens table (for generating QR codes)
CREATE TABLE IF NOT EXISTS exam_qr_tokens (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  qr_data JSONB, -- Stores QR code data: {studentId, examId, courseId, semester, subject, examDate}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id, subject_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_course_semester ON exams(course_id, semester);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_id ON exam_subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attendance_exam_student ON exam_attendance(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_exam_qr_tokens_student ON exam_qr_tokens(student_id);
