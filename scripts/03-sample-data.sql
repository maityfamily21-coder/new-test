-- Insert sample students with interests for testing

-- First, let's add a sample student
INSERT INTO students (
    full_name, enrollment_number, course_id, email, phone_number, 
    parent_phone_number, admission_semester, current_semester, 
    resume_link, agreement_link, placement_status, company_name, 
    placement_tenure_days, password
) VALUES (
    'John Doe', '2021001', 1, 'john.doe@example.com', '9876543210',
    '9876543211', 1, 3, 'https://drive.google.com/resume1', 
    'https://drive.google.com/agreement1', 'Active', NULL, 0, 'password123'
) ON CONFLICT (enrollment_number) DO NOTHING;

-- Add interests for the sample student
INSERT INTO student_interests (student_id, interest_id) 
SELECT s.id, i.id 
FROM students s, interests i 
WHERE s.enrollment_number = '2021001' 
AND i.name IN ('Software Development', 'Web Development', 'AI/ML')
ON CONFLICT (student_id, interest_id) DO NOTHING;

-- Add another sample student
INSERT INTO students (
    full_name, enrollment_number, course_id, email, phone_number, 
    parent_phone_number, admission_semester, current_semester, 
    resume_link, agreement_link, placement_status, company_name, 
    placement_tenure_days, password
) VALUES (
    'Jane Smith', '2021002', 2, 'jane.smith@example.com', '9876543212',
    '9876543213', 1, 3, 'https://drive.google.com/resume2', 
    'https://drive.google.com/agreement2', 'Placed', 'TechCorp', 90, 'password456'
) ON CONFLICT (enrollment_number) DO NOTHING;

-- Add interests for the second sample student
INSERT INTO student_interests (student_id, interest_id) 
SELECT s.id, i.id 
FROM students s, interests i 
WHERE s.enrollment_number = '2021002' 
AND i.name IN ('Data Science', 'AI/ML')
ON CONFLICT (student_id, interest_id) DO NOTHING;

-- Add sample companies
INSERT INTO companies (name, position, description, interest_id, application_deadline) 
SELECT 'Google', 'Software Engineer', 'Join our team to build innovative solutions', i.id, CURRENT_DATE + INTERVAL '30 days'
FROM interests i WHERE i.name = 'Software Development'
ON CONFLICT DO NOTHING;

INSERT INTO companies (name, position, description, interest_id, application_deadline) 
SELECT 'Microsoft', 'Frontend Developer', 'Build amazing user experiences', i.id, CURRENT_DATE + INTERVAL '25 days'
FROM interests i WHERE i.name = 'Web Development'
ON CONFLICT DO NOTHING;

INSERT INTO companies (name, position, description, interest_id, application_deadline) 
SELECT 'OpenAI', 'ML Engineer', 'Work on cutting-edge AI technology', i.id, CURRENT_DATE + INTERVAL '20 days'
FROM interests i WHERE i.name = 'AI/ML'
ON CONFLICT DO NOTHING;

-- Add sample seminars
INSERT INTO seminars (title, description, interest_id, seminar_date) 
SELECT 'Introduction to React', 'Learn the basics of React development', i.id, CURRENT_TIMESTAMP + INTERVAL '7 days'
FROM interests i WHERE i.name = 'Web Development'
ON CONFLICT DO NOTHING;

INSERT INTO seminars (title, description, interest_id, seminar_date) 
SELECT 'Machine Learning Fundamentals', 'Understanding ML concepts and applications', i.id, CURRENT_TIMESTAMP + INTERVAL '10 days'
FROM interests i WHERE i.name = 'AI/ML'
ON CONFLICT DO NOTHING;

-- Add sample messages
INSERT INTO messages (title, content, message_type, interest_id) 
SELECT 'Important Update for Software Developers', 'New opportunities available in software development. Please check the portal regularly.', 'interest', i.id
FROM interests i WHERE i.name = 'Software Development'
ON CONFLICT DO NOTHING;

INSERT INTO messages (title, content, message_type, course_id, semester) 
SELECT 'Semester 3 Placement Drive', 'Placement activities will begin next month. Ensure your resume is updated.', 'course_semester', c.id, 3
FROM courses c WHERE c.name = 'Computer Science Engineering'
ON CONFLICT DO NOTHING;
