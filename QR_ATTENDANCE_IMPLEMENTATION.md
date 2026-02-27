# Subject-Wise QR Attendance System Implementation

## Overview
This document outlines the fully automated exam QR attendance system with subject-wise QR code generation and real-time attendance marking.

## Key Features Implemented

### 1. Subject-Wise QR Code Generation
When an admin creates an exam, the system now:
- Generates **individual QR tokens for each subject** per student
- Each QR code contains: `{examId}_{studentId}_{subjectId}_{timestamp}`
- QR codes are automatically created for all students in the course/semester

### 2. Student Exam Portal (`/student/exams`)
Students can now:
- **View exam schedule** organized by subjects
- **Generate subject-wise QR codes** for each exam subject
- **Display QR code details**: Subject name, code, total marks, exam date & time
- **Download individual subject QR codes** as PNG files
- Keep using the general exam QR (hall ticket) alongside subject QRs

#### Subject-Wise QR Display:
\`\`\`
Exam Name: Final Exam
├─ Subject 1 (CS101) - 100 marks - Oct 31, 2:00 PM
│  └─ [Generate Subject QR] → [Download]
├─ Subject 2 (CS102) - 100 marks - Oct 31, 4:00 PM
│  └─ [Generate Subject QR] → [Download]
\`\`\`

### 3. Admin QR Attendance System
Admin workflow (`/admin/exams/attendance`):

**Step 1: Select Configuration**
- Choose Course → Semester → Exam → Subject (required)

**Step 2: View Students**
- System automatically displays **ONLY students who have that subject**
- Shows total count, marked count, remaining count
- Search by name or enrollment number

**Step 3: Mark Attendance**
- Click "Open QR Scanner" (camera opens immediately, not hidden)
- Scan each student's subject-specific QR code
- Real-time updates:
  - Student row turns green immediately
  - "Scanned" badge appears
  - Attendance count updates live
  - No page reload needed
  - Audio beep + visual flash on each scan

**Step 4: Complete Marking**
- Close scanner when all students scanned
- All attendance records saved to `exam_attendance` table

## Database Schema

### New Tables & Fields

#### `student_subjects` (NEW)
Links students to their enrolled subjects
\`\`\`sql
CREATE TABLE student_subjects (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  subject_id INTEGER REFERENCES subjects(id),
  UNIQUE(student_id, subject_id)
);
\`\`\`

#### `exam_qr_tokens` (EXTENDED)
Already exists, now properly utilized:
- `id`: Primary key
- `exam_id`: Links to exam
- `student_id`: Links to student
- `subject_id`: **Links to specific subject** (key for filtering)
- `token`: Unique QR token
- `qr_data`: JSON with all QR info

#### `exam_attendance` (USED AS-IS)
Stores attendance records:
- `exam_id`, `student_id`, `subject_id`: Composite key
- `attendance_status`: 'present' or 'absent'
- `scanned_at`: Timestamp of scan

## API Endpoints

### 1. Get Students by Subject
\`\`\`
GET /api/admin/exams/{examId}/students-by-subject?courseId={courseId}&semester={sem}&subjectId={subjectId}
\`\`\`
Returns: Array of students with `attendance_status`
**Key Change**: Filters students who have that specific subject

### 2. Get Subjects with QR Info
\`\`\`
GET /api/admin/exams/{examId}/subjects-with-qr
\`\`\`
Returns: Exam details + subjects with QR token counts

### 3. Generate Student Subject QR Codes
\`\`\`
GET /api/student/exams/{examId}/subjects-qr?studentId={studentId}
\`\`\`
Returns: Array of subject QR codes with:
- subject_id, subject_name, subject_code
- total_marks, exam_date
- qr_code (data URL)

### 4. Look Up Student from QR Token
\`\`\`
GET /api/student-qr/{token}/data
\`\`\`
Returns: Student info for scanner validation
\`\`\`json
{
  "success": true,
  "student": {
    "id": 123,
    "name": "Student Name",
    "enrollment_number": "ABC123",
    "course_id": 1,
    "semester": 3
  },
  "exam": {
    "id": 45,
    "subject_id": 67
  }
}
\`\`\`

## Implementation Steps

### For Development Team:

1. **Run Database Migration**
   \`\`\`bash
   # Execute script/02-add-subject-enrollment.sql
   # This creates student_subjects table and populates initial data
   \`\`\`

2. **Deploy New API Endpoints**
   - `/api/admin/exams/{examId}/students-by-subject`
   - `/api/admin/exams/{examId}/subjects-with-qr`
   - `/api/student/exams/{examId}/subjects-qr`
   - `/api/student-qr/{token}/data`

3. **Update Components**
   - Admin attendance page now filters students by subject
   - Student exams page now shows subject-wise QR codes

4. **Test Flow**
   - Admin creates exam with 2 subjects
   - Verify 2 different QR tokens generated per student
   - Student downloads subject QRs separately
   - Admin scans subject QRs, attendance marked per subject

## Usage Flow

### Admin Creating Exam
\`\`\`
1. Admin → Exam Management → Select Course, Semester
2. Enter Exam Name, Select Subjects with Marks
3. Set exam date/time (same for all subjects or per-subject)
4. System generates subject-specific QR tokens automatically
\`\`\`

### Student Getting QR Codes
\`\`\`
1. Student → My Exams → Click exam
2. Expand each subject
3. Click "Generate Subject QR" for that subject
4. Download individual QR codes
5. Can also generate general hall ticket QR
\`\`\`

### Admin Marking Attendance
\`\`\`
1. Admin → QR Attendance
2. Select Course → Semester → Exam → Subject
3. Students list loads automatically (only for that subject)
4. Click "Open QR Scanner"
5. Camera opens, scan each student's QR
6. Each scan: marks present instantly, row turns green
7. Can search student if needed
8. Close scanner when done
\`\`\`

## Real-Time Features

✅ **Instant Marking**: No page reload, updates live
✅ **Subject Filtering**: Shows only students with that subject
✅ **Visual Feedback**: Green highlight, badge, audio beep
✅ **Live Statistics**: Present/Remaining counts update in real-time
✅ **Search While Scanning**: Find student without closing camera
✅ **Duplicate Detection**: Prevents scanning same QR twice
✅ **Persistent Storage**: All records saved to database

## File Structure

\`\`\`
app/
├── api/
│   ├── admin/exams/[examId]/
│   │   ├── students-by-subject/route.ts (NEW)
│   │   ├── subjects-with-qr/route.ts (NEW)
│   │   └── subjects/route.ts (EXISTING)
│   ├── student/exams/[examId]/
│   │   ├── subjects-qr/route.ts (NEW)
│   │   └── qr/route.ts (EXISTING)
│   └── student-qr/[token]/
│       └── data/route.ts (NEW)
├── admin/exams/
│   ├── attendance/page.tsx (UPDATED)
│   └── page.tsx (EXISTING)
└── student/exams/
    └── page.tsx (UPDATED)

lib/
└── exam-utils.ts (UPDATED)

scripts/
├── 01-create-exam-tables.sql (EXISTING)
└── 02-add-subject-enrollment.sql (NEW)
\`\`\`

## Troubleshooting

### Issue: No students showing when selecting subject
- Check: `student_subjects` table is populated
- Fix: Run migration `02-add-subject-enrollment.sql`
- Verify: SELECT count(*) FROM student_subjects;

### Issue: QR code doesn't generate for student
- Check: Student is enrolled in the subject
- Verify: Exam was created successfully
- Check: exam_qr_tokens has records for this exam_id

### Issue: Camera won't open in scanner
- Check: Browser has camera permission
- Fix: Allow camera in browser settings
- Try: Different browser or device

### Issue: Attendance not marking
- Check: QR token is valid (not expired)
- Verify: Student ID matches in database
- Check: API endpoint responding

## Future Enhancements

- Bulk import student-subject mappings
- Subject-wise attendance reports
- Automated email confirmations
- Mobile app for attendance marking
- Analytics dashboard per subject
