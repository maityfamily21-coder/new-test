# Exam Management System Setup

## Database Migration Required

The exam system requires new database tables. Follow these steps:

### Step 1: Run Database Migration
The migration script is located at: `scripts/01-create-exam-tables.sql`

You need to execute this SQL script in your Neon database:

1. Go to your Neon dashboard
2. Open the SQL editor
3. Copy the contents of `scripts/01-create-exam-tables.sql`
4. Execute the script

### Step 2: Verify Tables Created
After running the migration, verify these tables exist:
- `exams`
- `exam_subjects`
- `exam_attendance`
- `exam_qr_tokens`

### Step 3: Access the Exam System

**Admin Portal:**
- Navigate to Admin Dashboard
- Click "Manage Exams" button
- Create exams by selecting course, semester, and subjects

**Student Portal:**
- Go to `/student/exams`
- View all exams for your course/semester
- Generate QR codes for digital hall tickets

**QR Attendance:**
- Go to Admin Dashboard
- Click "QR Attendance" button
- Scan student QR codes to mark attendance

## Features

### Phase 1: Exam Creation
- Select course and semester
- Auto-load subjects for that course/semester
- Set exam date and marks per subject
- Automatically generates QR tokens for all students

### Phase 2: Student Exam Display
- View upcoming and ongoing exams
- Generate digital hall tickets (QR codes)
- Download QR codes for offline access
- Responsive mobile-friendly design

### Phase 3: QR-Based Attendance
- Camera-based QR scanning
- Real-time attendance marking
- Attendance records linked to exams
- Toast notifications for each scan

## Troubleshooting

If you see "Application error" when accessing `/admin/exams`:
1. Ensure the database migration has been run
2. Check that all exam tables exist in your database
3. Refresh the page

If QR codes don't generate:
1. Verify students are enrolled in the course/semester
2. Check that exam was created successfully
3. Ensure QR tokens were generated during exam creation
