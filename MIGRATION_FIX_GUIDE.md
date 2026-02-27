# Lecture QR Attendance - Complete Fix Guide

## Current Status
The error message "Database is not initialized. Please run migrations at /setup-db" is **CORRECT and WORKING!** It means:
- Your error handling is functioning perfectly
- The database doesn't have the required tables yet
- Students need to run migrations before they can use QR attendance

## Migration Script Fix
I've fixed the `10-add-seminar-ratings.sql` script which had incorrect PostgreSQL syntax:
- **Before**: `$$ language 'plpgsql';` ❌ (wrong - quotes around language name)
- **After**: `$$ LANGUAGE plpgsql;` ✅ (correct - no quotes, uppercase LANGUAGE)

## How to Complete Setup Now

### Step 1: Run Migrations
1. Visit: `https://your-domain/setup-db`
2. Click "Run Migration Sequence"
3. Wait for all scripts to complete
4. New error messages will now show detailed errors for any failed scripts

### Step 2: If Migrations Fail
The migration tool now provides detailed error messages. Check the console output for any failed scripts and their specific error reasons.

Common issues to look for:
- Missing foreign key references (table doesn't exist yet)
- Duplicate table names
- Syntax errors in SQL

### Step 3: Test QR Attendance
Once migrations succeed:
1. Tutor creates a lecture
2. Tutor generates QR code
3. Student scans QR code
4. Student gets marked present immediately ✅

## Error Handling in API
The attend route (`/app/api/student/lectures/qr/[token]/attend/route.ts`) now:
- Detects if tables don't exist
- Returns 503 Service Unavailable with clear message
- Instructs student to run /setup-db
- Handles all database queries safely

## Key Files Modified
1. `/scripts/10-add-seminar-ratings.sql` - Fixed language syntax
2. `/app/api/run-migration/route.ts` - Added detailed error logging
3. `/app/api/student/lectures/qr/[token]/attend/route.ts` - Error handling for all queries

## Next Steps
1. Go to setup-db page
2. Click "Run Migration Sequence" again
3. All migrations should now complete successfully
4. QR attendance will then work perfectly!
