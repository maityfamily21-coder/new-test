# Lecture QR Attendance - Troubleshooting Guide

## Current Error: "column 'student_id' does not exist"

### Root Causes
1. **`lecture_attendance` table not created** - The table DDL hasn't run yet
2. **Missing foreign key tables** - `lectures` or `students` table doesn't exist
3. **Database connection issue** - SQL queries are failing silently

### Step-by-Step Fix

#### Step 1: Initialize Database Tables
Visit this URL in your browser:
```
https://your-domain/api/student/lectures/qr/init
```

This will:
- Check if all required tables exist
- Create `lecture_qr_tokens` table if missing
- Create `lecture_attendance` table if missing
- Return column information for verification

Expected response:
```json
{
  "success": true,
  "message": "QR system initialized",
  "existingTables": ["lecture_qr_tokens", "lecture_attendance", "lectures", "students", "subjects", "courses"],
  "lectureAttendanceColumns": [
    { "name": "id", "type": "integer" },
    { "name": "lecture_id", "type": "integer" },
    { "name": "student_id", "type": "integer" },
    { "name": "status", "type": "character varying" },
    { "name": "created_at", "type": "timestamp without time zone" }
  ]
}
```

#### Step 2: Verify Database Schema
1. Go to Neon dashboard
2. Check `lecture_attendance` table has these columns:
   - `id` (PRIMARY KEY)
   - `lecture_id` (FOREIGN KEY → lectures.id)
   - `student_id` (FOREIGN KEY → students.id)
   - `status` (VARCHAR)
   - `created_at` (TIMESTAMP)

#### Step 3: Verify Lecture Data
Run this SQL query in Neon console:
```sql
SELECT l.id, l.title, s.id as subject_id, s.course_id, s.semester
FROM lectures l
JOIN subjects s ON l.subject_id = s.id
LIMIT 5;
```

#### Step 4: Verify Student Data
Run this SQL query in Neon console:
```sql
SELECT id, name, course_id, current_semester
FROM students
WHERE course_id IS NOT NULL
LIMIT 5;
```

#### Step 5: Test QR Attendance Flow
1. Tutor creates a lecture QR code
2. Student scans the QR code
3. Check browser console for logs - should see:
   ```
   [v0] QR URL received: https://...lectures/qr/{token}
   [v0] Extracted token: {uuid}
   [v0] Submitting QR attendance with token: {uuid} studentId: {number}
   ```

### Common Issues

#### Issue 1: "column 'student_id' does not exist"
**Solution**: Run `/api/student/lectures/qr/init` endpoint

#### Issue 2: "Lecture not found"
**Check**:
- Lecture exists in database
- Lecture has a `subject_id`
- Subject exists and has `course_id`
- Course exists

#### Issue 3: "You are not enrolled for this lecture's course/semester"
**Check**:
- Student's `course_id` matches lecture's course
- Student's `current_semester` matches lecture's semester

#### Issue 4: "Attendance already marked" (409)
**This is normal** - Student already marked attendance for this lecture

#### Issue 5: "Invalid or expired QR code" (404)
**Check**:
- QR token exists in `lecture_qr_tokens` table
- QR code is less than 4 seconds old
- Token matches the scanned URL

### Testing Workflow

#### For Tutor:
1. Login to tutor portal
2. Create/Select a lecture
3. Click "Generate QR Code"
4. Verify QR code is displayed

#### For Student:
1. Login to student portal
2. Go to Dashboard
3. Click "Mark Lecture Attendance" or "Scan QR"
4. Allow camera access
5. Point camera at QR code
6. Should see "Attendance marked successfully"

### Debug Logs Location
- **Browser Console**: F12 → Console tab (shows [v0] logs)
- **Server Logs**: Check Vercel deployment logs for detailed errors
- **Database**: Check Neon dashboard for query logs

### Manual Attendance Insertion (Emergency)
If QR system fails, manually insert attendance via SQL:
```sql
INSERT INTO lecture_attendance (lecture_id, student_id, status)
VALUES (1, 123, 'Present')
ON CONFLICT (lecture_id, student_id) DO UPDATE SET status = 'Present';
```

### Support Commands
- **Check QR Init**: `GET /api/student/lectures/qr/init`
- **Check Debug Info**: `GET /api/student/lectures/qr/debug`
- **Setup DB**: Visit `/setup-db` page
