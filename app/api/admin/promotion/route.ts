import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const promotionData = await sql`
      SELECT 
        c.name as course_name,
        c.total_semesters,
        s.current_semester,
        COUNT(*) as student_count
      FROM students s
      JOIN courses c ON s.course_id = c.id
      GROUP BY c.name, c.total_semesters, s.current_semester
      ORDER BY c.name, s.current_semester
    `

    return NextResponse.json({ success: true, promotionData })
  } catch (error) {
    console.error("Promotion data fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch promotion data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    // Promote all students who are not in their final semester
    const result = await sql`
      UPDATE students 
      SET current_semester = current_semester + 1
      FROM courses c
      WHERE students.course_id = c.id 
      AND students.current_semester < c.total_semesters
    `

    return NextResponse.json({
      success: true,
      message: "Students promoted successfully",
      promotedCount: result.count,
    })
  } catch (error) {
    console.error("Promotion error:", error)
    return NextResponse.json({ success: false, message: "Failed to promote students" }, { status: 500 })
  }
}
