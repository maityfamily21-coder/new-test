# Quick Start: Batch System

## Installation Steps

### 1. Run Database Migration
Execute the batch system migration:
\`\`\`sql
-- Run scripts/30-create-batch-system.sql in your Neon database
\`\`\`

### 2. Access Batch Management
- Log in as Super Admin
- Go to Dashboard
- Click on "Batch Management" (or navigate to `/admin/batches`)

### 3. Create First Batch
1. Select a Course (e.g., "B.Sc. Cloud Technology")
2. Select a Semester (e.g., Semester 1)
3. Click "Create Batch"
4. Enter:
   - Batch Number: `1`
   - Batch Name: `Batch A`
   - Description: `Morning Session`
5. Click "Create Batch"

### 4. Assign Students to Batch
1. Click the "0" (Students) button next to the batch
2. Click "Add Students"
3. Search for and select students
4. Click "Add N Student(s)"

### 5. Create Batch-Specific Lecture
1. Login as Tutor
2. Go to Subjects → Lectures
3. Click "Create Lecture"
4. **NEW**: Select the batch from dropdown
5. Fill lecture details
6. Click "Create Lecture"

### 6. Mark Attendance
1. Click "Attendance" on the lecture
2. **NEW**: Only batch students appear
3. Mark attendance normally
4. Save

## System Behavior

### When Batches Exist
- Tutor **must** select batch when creating lecture
- Attendance shows **only batch students**
- Lecture is batch-specific

### When No Batches Exist
- Tutor creates lectures normally (no batch selection)
- Attendance shows all subject students
- System works exactly as before

## Benefits

✅ Organize large course sections into manageable batches
✅ Assign different batches to different tutors/timeslots
✅ Track batch-specific attendance and performance
✅ Maintain backward compatibility with non-batched courses
✅ Flexible student reassignment between batches
