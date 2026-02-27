-- Create database tables for GUCPC Placement Portal

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_semesters INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    course_id INTEGER REFERENCES courses(id),
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    parent_phone_number VARCHAR(20) NOT NULL,
    admission_semester INTEGER NOT NULL,
    current_semester INTEGER NOT NULL,
    resume_link TEXT,
    agreement_link TEXT,
    placement_status VARCHAR(20) DEFAULT 'Active' CHECK (placement_status IN ('Active', 'Placed')),
    company_name VARCHAR(255),
    placement_tenure_days INTEGER DEFAULT 0,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student interests junction table
CREATE TABLE IF NOT EXISTS student_interests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    UNIQUE(student_id, interest_id)
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    description TEXT,
    interest_id INTEGER REFERENCES interests(id),
    application_deadline DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company applications table
CREATE TABLE IF NOT EXISTS company_applications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, company_id)
);

-- Seminars table
CREATE TABLE IF NOT EXISTS seminars (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    interest_id INTEGER REFERENCES interests(id),
    seminar_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seminar attendance table
CREATE TABLE IF NOT EXISTS seminar_attendance (
    id SERIAL PRIMARY KEY,
    seminar_id INTEGER REFERENCES seminars(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(10) DEFAULT 'Present' CHECK (status IN ('Present', 'Absent')),
    UNIQUE(seminar_id, student_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('interest', 'course_semester')),
    interest_id INTEGER REFERENCES interests(id),
    course_id INTEGER,
    semester INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
