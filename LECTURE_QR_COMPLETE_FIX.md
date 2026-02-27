# Lecture QR Attendance - Complete Fix Guide

## Problem
Students get error: **"Database setup failed: column 'student_id' does not exist"** when scanning lecture QR codes.

## Root Cause
The `lecture_attendance` table either doesn't exist in the database, or the database schema hasn't been properly initialized.

## Quick Fix Steps

### Step 1: Verify Database State
Visit this endpoint to check what tables exist:
```
https://your-domain/api/db-verify
```

This will show:
- Which tables exist and their columns
- Count of students, lectures, and attendance records
- Any errors

### Step 2: Run Database Migrations
If tables don't exist, run the migrations:

**Option A: Using Setup Page**
```
https://your-domain/setup-db
```
Click "Run Migration Sequence" button.

**Option B: Manual SQL Execution**
Connect to your database and run:

```sql
-- 1. Create lecture_attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS lecture_attendance (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent')),
  marked_by_tutor_id INTEGER REFERENCES tutors(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_id, student_id)
);

-- 2. Create QR tokens table
CREATE TABLE IF NOT EXISTS lecture_qr_tokens (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP NULL
);

-- 3. Create QR submissions table
CREATE TABLE IF NOT EXISTS lecture_qr_submissions (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  device_key TEXT,
  device_group TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lecture_attendance_lecture ON lecture_attendance(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_attendance_student ON lecture_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_lecture_qr_tokens_token ON lecture_qr_tokens(token);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_student_lecture ON lecture_qr_submissions(lecture_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_device ON lecture_qr_submissions(lecture_id, device_id);
```

### Step 3: Verify Again
After running migrations, check again:
```
https://your-domain/api/db-verify
```

Should show:
- All tables exist ✓
- lecture_attendance has columns: id, lecture_id, student_id, status, created_at, updated_at, marked_by_tutor_id ✓

### Step 4: Test QR Scanning
1. Have a tutor create a fresh QR code for a lecture
2. Have an enrolled student scan it within 4 seconds
3. Should see "Attendance marked successfully" ✓

## Troubleshooting

### Issue: Still getting 500 error after migrations
1. Check browser console - copy the full error message
2. Visit `/api/db-verify` to see what columns actually exist
3. The mismatch between what the code expects and what exists will show there

### Issue: Tutor can't create lectures
Make sure:
- `lectures` table exists
- `subjects` table has `course_id` and `semester` columns
- `tutors` table exists and tutor is properly created

### Issue: Student not enrolled in course/semester
Make sure:
- Student record has correct `course_id` and `current_semester`
- Lecture is created for a subject in that course

## SQL Debugging Queries

Check if lecture_attendance table exists and has data:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'lecture_attendance';

-- Check columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lecture_attendance';

-- Check data
SELECT COUNT(*) FROM lecture_attendance;
```

Check if student is enrolled:
```sql
SELECT id, name, course_id, current_semester 
FROM students 
WHERE id = [STUDENT_ID];
```

Check if lecture exists:
```sql
SELECT l.id, l.title, s.course_id, s.semester
FROM lectures l
JOIN subjects s ON l.subject_id = s.id
WHERE l.id = [LECTURE_ID];
```

## Changes Made to Code

1. **Fixed `/app/api/student/lectures/qr/[token]/attend/route.ts`**:
   - Enhanced `ensureQrDDL()` with better error handling
   - Added column consistency checks
   - Properly handles table creation with correct schema

2. **Created `/app/api/db-verify/route.ts`**:
   - Endpoint to verify all tables exist
   - Shows actual columns in database
   - Displays data counts

## Testing Checklist
- [ ] Database verification shows all tables exist
- [ ] All required columns are present
- [ ] Tutor can create lectures
- [ ] Student can scan QR code
- [ ] Attendance is marked in database
- [ ] No 500 errors in browser console

If issues persist after these steps, check the detailed error logs from `/api/db-verify` endpoint.
