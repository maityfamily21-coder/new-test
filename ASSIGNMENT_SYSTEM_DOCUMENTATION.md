# Assignment Management System Documentation

## Overview
A complete assignment management system for the Samanvay ERP platform enabling tutors to create and manage assignments, students to view assignments and grades, and admins to monitor assignment records.

## Database Schema

### Assignments Table
\`\`\`sql
- id (PRIMARY KEY)
- subject_id (FOREIGN KEY - subjects)
- tutor_id (FOREIGN KEY - tutors)
- title (VARCHAR 255)
- description (TEXT - optional)
- total_marks (INTEGER)
- status (ENUM: 'Active', 'Ended')
- created_at, updated_at (TIMESTAMPS)
\`\`\`

### Assignment Marks Table
\`\`\`sql
- id (PRIMARY KEY)
- assignment_id (FOREIGN KEY - assignments)
- student_id (FOREIGN KEY - students)
- marks_obtained (DECIMAL 5,2 - optional)
- submitted_at (TIMESTAMP)
- created_at, updated_at (TIMESTAMPS)
- UNIQUE(assignment_id, student_id)
\`\`\`

## Architecture

### Tutor Portal Flow

#### 1. Dashboard Enhancement
- Subject cards now have two action buttons:
  - "Lectures" → Manage lectures (existing feature)
  - "Assignments" → Manage assignments (new)

#### 2. Assignments List Page
- **Path**: `/tutor/subjects/[subjectId]/assignments`
- **Features**:
  - View all assignments for a subject
  - Create new assignments (title, description, total marks)
  - Delete assignments
  - End assignment (when ended, tutor can enter marks)
  - Progress tracker (how many students have marks entered)

#### 3. Marks Entry Page
- **Path**: `/tutor/subjects/[subjectId]/assignments/[assignmentId]`
- **Prerequisites**: Assignment must be "Ended"
- **Features**:
  - Table of all students in course-semester
  - Enter marks for each student (0 to total_marks)
  - Save marks individually
  - Visual feedback (Saved/Pending status)
  - Prevents invalid marks (must be within range)

### Student Portal
- **Path**: `/student/assignments`
- **Features**:
  - View all assignments for their course-semester
  - Display assignment details (title, description, total marks)
  - Show their marks if graded
  - Display percentage score
  - Status indicator (Active/Ended)

### Admin Dashboard
- **Path**: `/admin/assignments`
- **Features**:
  - View all assignments system-wide (read-only)
  - Search by assignment name, subject, or tutor
  - Progress bar showing marks submission progress
  - Status tracking (Active/Ended)
  - Course-semester and marks information

## API Endpoints

### Tutor Endpoints

#### GET /api/tutor/assignments
- Fetch all assignments for logged-in tutor
- Returns: assignments list with student counts and marks progress

#### POST /api/tutor/assignments
- Create new assignment
- Required: subjectId, title, totalMarks
- Optional: description
- Validation: Tutor must be assigned to the subject

#### GET /api/tutor/assignments/[id]
- Fetch specific assignment details
- Verification: Tutor must own the assignment

#### PUT /api/tutor/assignments/[id]
- Update assignment status (Active → Ended)
- Only Ended assignments allow marks entry

#### DELETE /api/tutor/assignments/[id]
- Delete assignment and all associated marks
- Verification: Tutor must own the assignment

#### GET /api/tutor/assignments/[id]/marks
- Fetch all students and their marks for an assignment
- Returns: Student list with existing marks (if any)

#### POST /api/tutor/assignments/[id]/marks
- Submit marks for a student
- Required: studentId, marks
- Validation: marks must be 0 to total_marks
- Assignment must be in "Ended" status
- Upsert logic: Updates if marks already exist

### Student Endpoints

#### GET /api/student/assignments
- Fetch all assignments for student's course-semester
- Returns: Assignment list with student's marks (if graded)

### Admin Endpoints

#### GET /api/admin/assignments
- Fetch all assignments system-wide
- Returns: Complete list with tutor info and marks progress
- Authentication: Admin only

## Key Features

### Assignment Lifecycle
1. **Created** - Tutor creates assignment (Active state)
2. **Active** - Students see the assignment, tutor can delete
3. **Ended** - Tutor clicks "End Assignment"
4. **Marks Entry** - Tutor enters marks for each student
5. **Graded** - Students can view their marks

### Marks Management
- Marks can only be entered after assignment is Ended
- One marks entry per student per assignment (UNIQUE constraint)
- Marks validated: must be 0 to total_marks
- Supports decimal marks (e.g., 7.5 out of 10)
- Timestamp tracking (submitted_at field)

### Data Isolation
- Assignments visible only to:
  - Their tutor (full access)
  - Students of that course-semester (read-only)
  - Admins (read-only, all assignments)
- Tutors can only manage assignments they created
- Tutors can only assign marks to students in their course-semester

### Backward Compatibility
- No changes to existing lecture, exam, attendance workflows
- Assignment system is completely independent
- Can be disabled without affecting other features
- Non-breaking database migration

## Security Considerations

1. **Authentication**: All endpoints require authentication
   - Tutors use tutor auth
   - Students use student auth
   - Admins use admin auth

2. **Authorization**:
   - Tutors can only access their own assignments
   - Students can only see assignments for their course-semester
   - Admins have read-only access to all assignments

3. **Validation**:
   - Tutor must be assigned to subject before creating assignment
   - Marks must be within 0 to total_marks range
   - Marks can only be entered for Ended assignments
   - Unique constraint prevents duplicate marks entries

4. **Data Protection**:
   - Cascading deletes ensure data consistency
   - Foreign key constraints maintain referential integrity
   - Timestamps for audit trail

## Performance

### Indexes
- `idx_assignments_subject_id` - Query by subject
- `idx_assignments_tutor_id` - Query by tutor
- `idx_assignments_status` - Filter by status
- `idx_assignment_marks_assignment_id` - Query marks by assignment
- `idx_assignment_marks_student_id` - Query marks by student
- `idx_assignment_marks_submitted` - Filter by submission status

### Query Patterns
- Efficient grouping for counts (student counts, marks submitted)
- Indexed lookups for common filters
- Left joins to avoid missing data

## Integration with Existing Systems

### With Subject Management
- Assignments tied to subjects
- Only tutors assigned to subjects can create assignments
- Subjects provide course-semester context for student filtering

### With Batch System
- Current implementation uses course-semester for student filtering
- Can be extended to include batch_id for batch-specific assignments
- Marks would be batch-specific if batches are used

### With Existing Workflows
- Completely independent from lectures
- Independent from exam marks
- Independent from attendance
- Can coexist without conflicts

## Usage Examples

### Tutor Creates Assignment
\`\`\`typescript
POST /api/tutor/assignments
{
  "subjectId": 5,
  "title": "Mid-Term Assignment",
  "description": "Covers chapters 1-4",
  "totalMarks": 50
}
\`\`\`

### Tutor Ends Assignment
\`\`\`typescript
PUT /api/tutor/assignments/123
{
  "status": "Ended"
}
\`\`\`

### Tutor Enters Marks
\`\`\`typescript
POST /api/tutor/assignments/123/marks
{
  "studentId": 456,
  "marks": 42.5
}
\`\`\`

## File Structure

\`\`\`
scripts/
└── 31-create-assignment-system.sql

app/api/tutor/
└── assignments/
    ├── route.ts (GET, POST)
    └── [id]/
        ├── route.ts (GET, PUT, DELETE)
        └── marks/route.ts (GET, POST)

app/api/student/
└── assignments/route.ts (GET)

app/api/admin/
└── assignments/route.ts (GET)

app/tutor/subjects/[subjectId]/
└── assignments/
    ├── page.tsx (List & Create)
    └── [assignmentId]/page.tsx (Marks Entry)

app/student/
└── assignments/page.tsx (View Assignments)

app/admin/
└── assignments/page.tsx (Monitor Assignments)

app/tutor/dashboard/
└── page.tsx (Updated with Assignments button)
\`\`\`

## Future Enhancements

1. **Batch-Specific Assignments** - Filter students by batch if batches exist
2. **Due Dates** - Add assignment deadline tracking
3. **Submission Status** - Track if students submitted assignments (not just marks)
4. **Rubrics** - Support for detailed grading rubrics
5. **Notifications** - Notify students when grades are posted
6. **Bulk Import** - Import marks from CSV
7. **Assignment Templates** - Reusable assignment configurations
8. **Analytics** - Class performance metrics and grade distribution

## Testing Checklist

- [ ] Tutor can create assignment with all fields
- [ ] Tutor can view all their assignments
- [ ] Tutor can delete assignment
- [ ] Tutor can end assignment
- [ ] Tutor can enter marks after ending
- [ ] Marks validation works (0 to total_marks)
- [ ] Student can view assignments
- [ ] Student can see their marks when graded
- [ ] Admin can view all assignments
- [ ] Admin cannot modify assignments
- [ ] Marks progress bar updates
- [ ] Cascade delete works (deleting assignment removes marks)
- [ ] Non-assigned tutors cannot create for other subjects
- [ ] Students only see assignments for their course-semester

## Deployment Steps

1. Run migration: `scripts/31-create-assignment-system.sql`
2. Deploy API routes (app/api/)
3. Deploy UI pages (app/tutor/, app/student/, app/admin/)
4. Update Tutor Dashboard to show Assignments button
5. Test complete workflow end-to-end
6. Deploy to production
7. Announce feature to tutors, students, and admins
8. Monitor for issues and errors

## Support & Documentation

For additional help:
- Check this documentation file
- Review inline code comments
- Check API endpoint error messages
- Monitor server logs for issues
