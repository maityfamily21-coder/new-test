# Batch System Setup & Configuration

## Environment & Dependencies

No new packages required. Uses existing:
- `@neondatabase/serverless` for database access
- React hooks and Next.js app router
- shadcn/ui components
- Existing authentication system

## Database Requirements

- Neon PostgreSQL database with existing schema
- Must have `courses`, `students`, `subjects` tables
- Must have `lectures` table (already exists)

## Configuration

### Enable Batch System
1. Run migration: `scripts/30-create-batch-system.sql`
2. No environment variables needed
3. No backend configuration required

### Access Control
Currently requires:
- Super Admin role for batch management
- Tutor role for batch selection during lecture creation
- Existing role-based authentication is used

## File Structure

\`\`\`
app/
├── admin/
│   └── batches/
│       ├── page.tsx          # Batch list & creation
│       └── [batchId]/
│           └── students/
│               └── page.tsx   # Student management
├── api/
│   ├── admin/
│   │   └── batches/
│   │       ├── route.ts       # Batch CRUD
│   │       └── [batchId]/
│   │           ├── route.ts   # Single batch operations
│   │           └── students/
│   │               └── route.ts # Student assignment
│   └── tutor/
│       ├── lectures-batch-check/
│       │   └── route.ts       # Check if batches exist
│       └── lectures/
│           ├── route.ts       # Updated to handle batch_id
│           └── [lectureId]/
│               └── attendance/
│                   └── route.ts # Updated to filter by batch
└── tutor/
    └── subjects/
        └── [subjectId]/
            └── lectures/
                └── page.tsx   # Updated with batch selection
\`\`\`

## Performance Optimizations

### Indexes Created
- `idx_batch_students_batch_id` - Fast batch student lookup
- `idx_batch_students_student_id` - Fast student batch lookup
- `idx_batches_course_semester` - Fast course-semester batch lookup
- `idx_lectures_batch_id` - Fast lecture batch filtering

### Query Optimization
- Attendance queries use batch_id when available (avoids subject scan)
- Batch student lists use indexed lookups
- Minimal database round trips

## Scaling Considerations

### For Large Student Numbers
- Batch system reduces attendance query scope significantly
- Each batch operates independently
- Indexes ensure constant time student lookups

### For Many Batches
- Course-semester index enables fast batch listing
- No impact on non-batched course-semesters
- Pagination ready if needed

## Troubleshooting

### Batch Selection Not Appearing
- Verify: Course-semester has at least one batch created
- Check: Browser cache (hard refresh)
- Confirm: Logged in as correct tutor

### Students Not Appearing in Attendance
- Verify: Students are assigned to the batch
- Check: Lecture was created with batch_id set
- Confirm: Students are enrolled in the course

### Migration Failed
- Ensure: Database URL is correct
- Verify: User has ALTER TABLE permissions
- Check: PostgreSQL version compatibility (9.6+)

## Future Considerations

- Role-based batch admin assignment (assign admins to specific batches)
- Batch-level reports and analytics
- Automatic batch creation from enrollment lists
- Batch transfer workflows
- Integration with exam batching
