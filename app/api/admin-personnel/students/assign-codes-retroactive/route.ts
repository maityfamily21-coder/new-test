import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateUniqueStudentCode } from "@/lib/student-code-generator"

/**
 * Endpoint to retroactively assign unique codes to existing students
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting retroactive student code assignment")

    // Get all students without a unique code
    const studentsWithoutCodes = await sql`
      SELECT id, full_name 
      FROM students 
      WHERE unique_code IS NULL 
      ORDER BY created_at ASC
    `

    if (studentsWithoutCodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No students found needing code assignment",
      })
    }

    console.log(`[MYT] Found ${studentsWithoutCodes.length} students needing codes`)

    let assignedCount = 0
    const errors = []

    for (const student of studentsWithoutCodes) {
      try {
        const unique_code = await generateUniqueStudentCode()

        await sql`
          UPDATE students 
          SET unique_code = ${unique_code} 
          WHERE id = ${student.id}
        `

        assignedCount++
        if (assignedCount % 50 === 0) {
          console.log(`[MYT] Assigned ${assignedCount} codes...`)
        }
      } catch (err) {
        console.error(`[MYT] Error assigning code to student ${student.id}:`, err)
        errors.push(`Student ${student.id} (${student.full_name}): ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned unique codes to ${assignedCount} students`,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[MYT] Retroactive assignment error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to assign codes: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
