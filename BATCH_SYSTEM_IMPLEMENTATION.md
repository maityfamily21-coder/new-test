# Batch System Implementation Guide

## Overview
The batch system allows Super Admins to create and manage student batches within a course-semester combination. When tutors create lectures for a course-semester with batches, they must select which batch the lecture is for. Attendance and visibility are then batch-specific.

## Database Schema

### New Tables
1. **batches** - Stores batch configurations
   - `id`: Primary key
   - `course_id`: References courses table
   - `semester`: Semester number (1-8)
   - `batch_name`: Name of batch (e.g., "Batch A")
   - `batch_number`: Unique number per course-semester
   - `description`: Optional batch description
   - `total_students`: Count of assigned students
   - `created_at`, `updated_at`: Timestamps

2. **batch_students** - Junction table for student-batch assignments
   - `id`: Primary key
   - `batch_id`: References batches table
   - `student_id`: References students table
   - `assigned_at`: Timestamp of assignment
   - Unique constraint on (batch_id, student_id)

### Modified Tables
- **lectures**: Added `batch_id` column to reference batches
  - `batch_id` is nullable to support non-batched lectures

## API Endpoints

### Batch Management (Admin)

#### GET /api/admin/batches
- **Parameters**: `courseId`, `semester`
- **Returns**: List of batches for a course-semester combination
- **Usage**: List batches when admin selects a course-semester

#### POST /api/admin/batches
- **Body**: 
  \`\`\`json
  {
    "courseId": number,
    "semester": number,
    "batchName": string,
    "description": string (optional),
    "batchNumber": number
  }
  \`\`\`
- **Returns**: Created batch object
- **Usage**: Create new batch for course-semester

#### GET /api/admin/batches/[batchId]
- **Returns**: Batch details with assigned students
- **Usage**: View batch and its students

#### PUT /api/admin/batches/[batchId]
- **Body**: `{ "batchName": string, "description": string }`
- **Returns**: Updated batch object
- **Usage**: Edit batch information

#### DELETE /api/admin/batches/[batchId]
- **Returns**: Success message
- **Usage**: Delete batch (cascades to batch_students)

#### GET /api/admin/batches/[batchId]/students
- **Returns**: List of students in batch
- **Usage**: View batch student list

#### POST /api/admin/batches/[batchId]/students
- **Body**: `{ "studentIds": [number] }`
- **Returns**: Number of added students
- **Usage**: Add students to batch

#### DELETE /api/admin/batches/[batchId]/students
- **Body**: `{ "studentIds": [number] }`
- **Returns**: Number of removed students
- **Usage**: Remove students from batch

### Batch Check (Tutor)

#### GET /api/tutor/lectures-batch-check
- **Parameters**: `subjectId`
- **Returns**: 
  \`\`\`json
  {
    "hasBatches": boolean,
    "batches": [{ "id", "batch_name", "batch_number" }],
    "courseId": number,
    "semester": number
  }
  \`\`\`
- **Usage**: Check if course-semester has batches before lecture creation

## User Flows

### Super Admin: Create Batch
1. Navigate to Admin Dashboard → Batch Management
2. Select Course and Semester
3. Click "Create Batch"
4. Enter batch number, name, and optional description
5. Batch is created and ready for student assignment

### Super Admin: Assign Students to Batch
1. From batch list, click on batch "Students" button
2. Click "Add Students"
3. Search and select students from available list
4. Click "Add N Student(s)"
5. Students are assigned and can be removed later

### Tutor: Create Batch-Specific Lecture
1. Go to subject lectures page
2. Click "Create Lecture"
3. **If batches exist for this course-semester:**
   - A "Select Batch" dropdown appears (required field)
   - Select the batch for this lecture
4. Fill lecture title, description, and date
5. Click "Create Lecture"
6. Lecture is created with batch_id set

### Tutor: Mark Batch-Specific Attendance
1. Click "Attendance" on a batch-specific lecture
2. **Only students from that batch are shown**
3. Mark attendance for batch students
4. Save attendance records

## Key Features

### Conditional Batch Selection
- Batch selection UI only appears when batches exist for the course-semester
- Batch field is required when batches exist
- System prevents creating lecture without batch selection if batches are configured

### Batch-Filtered Attendance
- When marking attendance for batch lectures, only batch students appear
- Non-batch lectures show all subject students (backward compatible)
- Attendance records reference the batch indirectly through lecture

### No Impact on Existing Functionality
- Non-batched lectures work exactly as before
- Batch columns are nullable
- System gracefully handles mixed batched/non-batched lectures

## Database Migration

Run the migration script to set up batch tables:
\`\`\`sql
-- From scripts/30-create-batch-system.sql
\`\`\`

This will:
1. Create `batches` table
2. Create `batch_students` junction table
3. Add `batch_id` column to `lectures` table
4. Create performance indexes

## UI Components

### Admin Batch Management Page (`/app/admin/batches/page.tsx`)
- Course and semester selector
- Batch creation dialog
- Batch list with actions (edit, delete, manage students)
- Search functionality

### Batch Students Management (`/app/admin/batches/[batchId]/students/page.tsx`)
- List of assigned students
- Add students dialog with search
- Remove student functionality
- Bulk operations ready

### Tutor Lecture Creation (Updated)
- Conditional batch selection dropdown
- Only shows when batches exist
- Validates batch selection if required

## Backend Changes Summary

1. **New API Routes**: 8 endpoints for batch management
2. **Updated Lecture APIs**: Modified to include batch_id
3. **Updated Attendance APIs**: Filter students by batch if lecture has batch_id
4. **Database Indexes**: Added for performance on frequently queried columns

## Testing Checklist

- [ ] Create batch for course-semester
- [ ] Assign students to batch
- [ ] Tutor sees batch selection in lecture creation
- [ ] Create lecture with batch selection
- [ ] Verify only batch students appear in attendance
- [ ] Remove batch and verify lecture behavior remains unchanged
- [ ] Create lecture without batch in non-batched course-semester
- [ ] Verify all existing features work without batches

## Future Enhancements

- Batch-specific exam settings
- Batch-based assignment distribution
- Batch-level performance analytics
- Auto-batching by enrollment patterns
- Batch transfer/reassignment workflows
