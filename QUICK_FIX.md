# Quick Fix - Attendance Database Errors

## Problem
Attendance marking features showing "500 Internal Server Error" on all dashboards.

## Root Cause
Missing database tables/columns:
- `personnel_attendance` table doesn't exist
- `tutor_attendance` missing required columns

## Quick Fix (2 Steps)

### Step 1: Run Migrations
Visit this URL in your browser:
```
https://your-app-domain.vercel.app/api/run-migration
```

Expected response:
```json
{
  "status": "Success",
  "logs": [
    "✅ Success: 001-tutor-attendance-schema-update.sql",
    "✅ Success: 002-personnel-attendance.sql"
  ]
}
```

### Step 2: Verify
Check tables were created:
```
https://your-app-domain.vercel.app/api/check-migrations
```

Should show `personnel_attendance` and `tutor_attendance` exist.

## Files Created
- `/scripts/001-tutor-attendance-schema-update.sql` - Fix tutor schema
- `/scripts/002-personnel-attendance.sql` - Create personnel table
- `/ATTENDANCE_FIX_GUIDE.md` - Full documentation

## What Was Fixed
✅ Personnel attendance table created with all required columns
✅ Tutor attendance schema updated with missing columns  
✅ Indexes added for performance and security
✅ Entry/Exit tracking enabled
✅ Device fingerprint security enabled

## Test
After migrations, try marking attendance on any dashboard:
- Admin Personnel Dashboard → Mark Attendance
- Staff Portal (Peon) → Mark Attendance
- Tutor Dashboard → Mark Attendance

## Troubleshooting
- Still getting errors? Check `/api/verify-tables` endpoint
- Migrations failed? Try `/api/run-migration` again (it retries)
- GPS not working? Ensure coordinates are within 100m of campus

Done! ✨
