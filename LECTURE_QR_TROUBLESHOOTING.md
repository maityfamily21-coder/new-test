# Lecture QR Attendance Troubleshooting Guide

## Problem
Students get "Invalid or expired QR code" error (404) when scanning valid lecture QR codes created by tutors.

## Root Cause
The database tables for lecture QR tokens are not being created properly before the student tries to scan.

## Solution Steps

### Step 1: Run Database Migration
1. Go to: `http://your-domain/setup-db`
2. Click "Run Migration Sequence"
3. Wait for all scripts to complete successfully
4. Look for "32-lecture-qr-attendance.sql" in the logs - it should show ✅

### Step 2: Verify Database Tables Exist
1. Go to: `http://your-domain/api/student/lectures/qr/debug`
2. You should see JSON output with:
   - `tables`: Should include `lecture_qr_tokens`, `lecture_attendance`, `lectures`, `students`
   - `tokenCount`: Number of QR tokens generated
   - `recentTokens`: List of recently created tokens

If tables are missing, the migration didn't run successfully.

### Step 3: Test the QR Flow

#### For Tutors:
1. Create a lecture in the dashboard
2. Click "Generate QR Code" 
3. This calls `/api/tutor/lectures/[lectureId]/qr` which creates an entry in `lecture_qr_tokens`
4. The QR should encode a URL like: `https://domain.com/lectures/qr/{uuid}/attend`

#### For Students:
1. Login as a student enrolled in that course/semester
2. Click "Scan Lecture QR"
3. Point camera at the QR code
4. The scanner extracts the token from the URL
5. Submits POST to `/api/student/lectures/qr/{token}/attend`
6. The endpoint checks:
   - ✅ Token exists in `lecture_qr_tokens`
   - ✅ Token is fresh (created within 4 seconds)
   - ✅ Student is enrolled in the course/semester
   - ✅ Attendance not already marked
   - ✅ No duplicate device submission
7. If all checks pass, inserts into `lecture_attendance` table

## Key Database Tables

### lecture_qr_tokens
```
id | lecture_id | token | active | created_at | deactivated_at
```
- One row per lecture
- Token is a UUID created fresh each time tutor displays QR
- `active` controls whether attendance collection is open
- `created_at` enforces 4-second expiration window

### lecture_attendance
```
id | lecture_id | student_id | status | created_at
```
- Records actual attendance marks
- UNIQUE constraint on (lecture_id, student_id) prevents duplicates

### lecture_qr_submissions
```
id | lecture_id | student_id | device_id | ip_address | user_agent | created_at
```
- Tracks device submissions to prevent abuse
- One device = one student per lecture

## Common Errors & Fixes

### Error: "Invalid or expired QR code" (404)
**Cause:** Token doesn't exist in database
**Fix:** 
- Ensure 32-lecture-qr-attendance.sql migration ran
- Check `/api/student/lectures/qr/debug` to verify tables exist
- Have tutor regenerate QR code (creates new token with fresh timestamp)

### Error: "QR code expired"
**Cause:** More than 4 seconds elapsed between QR generation and scan
**Fix:** Have tutor show a fresh QR code to student

### Error: "You are not enrolled for this lecture's course/semester"
**Cause:** Student enrolled in different course/semester than lecture
**Fix:** Verify student's current_semester matches the lecture's semester

### Error: "Your attendance is already marked"
**Cause:** Student already scanned this lecture
**Fix:** Student cannot scan same lecture twice. This is by design for fraud prevention.

### Error: "Attendance already recorded from this device"
**Cause:** Another student already marked attendance from this device
**Fix:** Use a different device or restart the browser

## Debug Checklist

- [ ] Migration script 32-lecture-qr-attendance.sql executed successfully
- [ ] All 4 tables exist: lecture_qr_tokens, lecture_attendance, lecture_qr_submissions, lectures, students
- [ ] Student is enrolled in correct course with matching semester
- [ ] Tutor displays fresh QR code (regenerate if older than 4 seconds)
- [ ] Student scans within 4 seconds of QR generation
- [ ] Student uses unique device (not same device as another student)
- [ ] Attendance hasn't been marked yet for this student+lecture combo
- [ ] Browser console shows successful POST request (status 200)

## API Endpoints Reference

**Tutor - Generate QR Code**
```
GET /api/tutor/lectures/[lectureId]/qr
Response: { success: true, token: "uuid", url: "...", qrCode: "data:image/..." }
```

**Tutor - Toggle Attendance Collection**
```
PUT /api/tutor/lectures/[lectureId]/qr
Body: { active: true/false }
```

**Student - Mark Attendance**
```
POST /api/student/lectures/qr/[token]/attend
Body: { studentId: 123, deviceInfo: {...} }
Response: { success: true, lectureName: "...", subjectName: "..." }
```

**Debug - Check Database Status**
```
GET /api/student/lectures/qr/debug
Response: { tables: [...], tokenCount: 5, recentTokens: [...] }
```
