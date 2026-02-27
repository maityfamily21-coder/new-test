import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Admin endpoint to fix the personnel_attendance table constraint
 * This fixes the check constraint to allow all user types: admin_personnel, accounts_personnel, technical_team, peon
 * 
 * Usage: POST /api/admin/fix-attendance-constraint?adminKey=<ADMIN_FIX_KEY>
 */
export async function POST(request: NextRequest) {
  try {
    // Check if admin fix key is provided (basic security)
    const adminKey = request.nextUrl.searchParams.get("adminKey")
    const expectedKey = process.env.ADMIN_FIX_KEY || "emergency-fix-attendance"

    if (adminKey !== expectedKey) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[Admin] Fixing attendance constraint...")

    // Step 1: Check if the constraint exists
    const constraintCheck = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'personnel_attendance' 
      AND constraint_name = 'check_valid_user_type'
    `

    let constraintExists = constraintCheck.length > 0

    // Step 2: Drop the old constraint if it exists
    if (constraintExists) {
      console.log("[Admin] Dropping old constraint...")
      try {
        await sql`
          ALTER TABLE personnel_attendance 
          DROP CONSTRAINT check_valid_user_type
        `
        console.log("[Admin] Old constraint dropped")
      } catch (dropError: any) {
        console.error("[Admin] Error dropping constraint:", dropError)
        // Continue anyway
      }
    }

    // Step 3: Add the new constraint with correct user types
    console.log("[Admin] Adding new constraint...")
    await sql`
      ALTER TABLE personnel_attendance 
      ADD CONSTRAINT check_valid_user_type 
      CHECK (user_type IN ('admin_personnel', 'accounts_personnel', 'technical_team', 'peon'))
    `
    console.log("[Admin] New constraint added successfully")

    // Step 4: Verify the constraint was added
    const verifyCheck = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'personnel_attendance' 
      AND constraint_name = 'check_valid_user_type'
    `

    if (verifyCheck.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Constraint was not added properly",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Attendance constraint fixed successfully",
      details: {
        constraintName: "check_valid_user_type",
        allowedUserTypes: ["admin_personnel", "accounts_personnel", "technical_team", "peon"],
        status: "Fixed",
      },
    })
  } catch (error) {
    console.error("[Admin] Error fixing constraint:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fix attendance constraint",
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
