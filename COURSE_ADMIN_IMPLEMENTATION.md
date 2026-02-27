# Course-Specific Admin Implementation (Updated)

## Overview

Added a new type of admin user within the main admin portal. Course admins login through the same `/admin/login` page and see all the same admin features and buttons, but are restricted to managing only their assigned courses. Other courses appear disabled/inaccessible.

## Database Changes

### Script: `28-add-course-admin-to-admins.sql`

1. **Extended `admins` table:**
   - `role` VARCHAR(20) - Values: 'super_admin', 'course_admin' (default: 'super_admin')
   - Added CHECK constraint to ensure valid roles

2. **New table: `admin_course_assignments`**
   - Links course admins to their assigned courses
   - `admin_id` - Foreign key to admins table
   - `course_id` - Foreign key to courses table
   - Unique constraint prevents duplicate assignments

## Authentication & Authorization

### Updated Library: `lib/admin-auth.ts`

Enhanced authentication to support both super admins and course admins:

- **`AuthenticatedAdmin` interface:**
  - Added `role` field ('super_admin' | 'course_admin')
  - Added `assignedCourses` array (only for course admins)

- **`validateAdminAuth()` function:**
  - Retrieves role and assigned courses during authentication
  - Returns complete admin profile with course restrictions

- **New helper functions:**
  - `hasAccessToCourse()` - Checks if admin can access a specific course
  - `getAccessibleCourses()` - Filters course list by admin's permissions

### Role Hierarchy

1. **Super Admin** (`super_admin`)
   - Full access to all courses and system features
   - Can manage course admin users via User Management page
   - No restrictions

2. **Course Admin** (`course_admin`)
   - Same admin portal interface as super admin
   - All features available (students, exams, seminars, tutors, attendance, etc.)
   - Data automatically filtered to show only assigned courses
   - Cannot access or modify data from other courses
   - Cannot create or manage other admin users

## API Endpoints

### User Management (Super Admin Only)

- `GET /api/admin/users` - List all admin users
- `POST /api/admin/users` - Create new admin user (super or course admin)
- `PUT /api/admin/users/[id]` - Update admin user and course assignments
- `DELETE /api/admin/users/[id]` - Delete admin user

### Authentication Flow

1. Admin or course admin logs in via `/api/admin/login`
2. System returns role and assigned courses (if course admin)
3. Data stored in localStorage for client-side filtering
4. Each API request includes token with role information
5. Server validates course access for all operations

## UI Implementation

### User Management Page

**Location:** `/admin/users` (Super Admin Only)

Features:
- List all admin users (super admins and course admins)
- Visual badges indicating user role
- Create new users with:
  - Username and password
  - Role selection (Super Admin or Course Admin)
  - Course assignment checkboxes (for course admins)
- Edit existing users:
  - Update credentials and role
  - Modify course assignments
- Delete users
- Password update (optional when editing)

### Dashboard Updates

**Location:** `/app/admin/dashboard/page.tsx`

- Shows role badge for course admins ("Course Admin")
- Displays "User Management" card only for super admins
- All other features remain visible to both roles

### Login Flow

Both super admins and course admins use the same login page (`/admin/login`):
1. Enter username and password
2. System authenticates and identifies role
3. Redirect to `/admin/dashboard`
4. Interface shows all features, but data is filtered by assigned courses

## Implementing Course Filtering

To add course filtering to any admin route:

\`\`\`typescript
import { validateAdminAuth, hasAccessToCourse } from "@/lib/admin-auth"

// In your route handler:
const authResult = await validateAdminAuth(request)
if (!authResult.success || !authResult.admin) {
  return createAdminUnauthorizedResponse()
}

// For course-specific operations:
if (!hasAccessToCourse(authResult.admin, courseId)) {
  return NextResponse.json({ 
    success: false, 
    message: "Access denied to this course" 
  }, { status: 403 })
}

// Filter queries by accessible courses:
const accessibleCourses = getAccessibleCourses(
  authResult.admin, 
  allCourseIds
)
\`\`\`

## Security Features

1. **Same Portal, Different Permissions:**
   - Course admins use the same interface as super admins
   - Authorization happens at the API level, not UI level
   - Data filtering prevents cross-course access

2. **Database-Level Protection:**
   - Course assignments stored in dedicated table
   - Foreign key constraints ensure data integrity
   - Role constraints prevent invalid values

3. **Audit Trail:**
   - All admin actions logged with role
   - Security audit log tracks login attempts
   - Failed access attempts recorded

## Usage Instructions

### Creating a Course Admin (Super Admin Only)

1. Login as super admin
2. Navigate to `/admin/users` from dashboard
3. Click "Add User"
4. Fill in the form:
   - Username (unique)
   - Password (required)
   - Role: Select "Course Admin (Limited to Assigned Courses)"
   - Check the courses this admin should manage
5. Click "Create"

### Course Admin Login Experience

1. Course admin logs in at `/admin/login` (same as super admin)
2. Sees complete admin dashboard with all feature cards
3. When clicking any feature (Students, Exams, etc.):
   - Only sees data for assigned courses
   - Cannot view or modify other courses
4. "User Management" option not available (super admin only)

### Updating Course Assignments

1. Super admin goes to `/admin/users`
2. Clicks edit icon on course admin user
3. Modifies assigned courses using checkboxes
4. Saves changes
5. Course admin immediately has updated access (requires re-login)

## Frontend Filtering Pattern

For pages that need to filter by course on the client side:

\`\`\`typescript
const adminData = JSON.parse(localStorage.getItem("adminData") || "{}")
const isSuperAdmin = adminData.role === "super_admin"
const assignedCourses = adminData.assignedCourses || []

// Filter courses in UI:
const visibleCourses = isSuperAdmin 
  ? allCourses 
  : allCourses.filter(c => assignedCourses.includes(c.id))

// Disable courses not assigned:
<Button disabled={!isSuperAdmin && !assignedCourses.includes(courseId)}>
\`\`\`

## Migration Path

To add course admin support to existing admin routes:

1. Routes already using `validateAdminAuth()` automatically support both roles
2. Add course filtering logic where needed:
   \`\`\`typescript
   const { admin } = authResult
   if (admin.role === "course_admin" && admin.assignedCourses) {
     // Filter query by admin.assignedCourses
   }
   \`\`\`
3. Update UI to show/hide elements based on role
4. Test with both super admin and course admin accounts

## Future Enhancements

- Granular permissions per course (read-only, edit, full control)
- Time-based access (temporary course admin assignments)
- Course admin activity reporting
- Bulk course assignment updates
- Email notifications when courses are assigned/unassigned
- Course admin can request access to additional courses
</markdown>
