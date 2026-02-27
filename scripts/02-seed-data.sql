-- Seed initial data

-- Insert default admin
INSERT INTO admins (username, password) VALUES ('admin', 'adminstudent') ON CONFLICT (username) DO NOTHING;

-- Insert sample courses
INSERT INTO courses (name, total_semesters) VALUES 
    ('Computer Science Engineering', 8),
    ('Information Technology', 8),
    ('Electronics and Communication', 8),
    ('Mechanical Engineering', 8)
ON CONFLICT DO NOTHING;

-- Insert sample interests
INSERT INTO interests (name) VALUES 
    ('Software Development'),
    ('Data Science'),
    ('Web Development'),
    ('Mobile App Development'),
    ('Cybersecurity'),
    ('AI/ML'),
    ('DevOps'),
    ('UI/UX Design')
ON CONFLICT (name) DO NOTHING;
