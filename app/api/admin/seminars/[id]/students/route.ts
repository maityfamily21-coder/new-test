import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const seminarId = Number.parseInt(params.id)

    // Get all students enrolled in this seminar
    const students = await sql`
      SELECT DISTINCT
        s.id,
        s.full_name,
        s.enrollment_number,
        s.course_id,
        c.name as course_name,
        s.current_semester
      FROM seminar_attendance sa
      JOIN students s ON s.id = sa.student_id
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE sa.seminar_id = ${seminarId}
      ORDER BY s.full_name
    `

    return NextResponse.json({
      success: true,
      students: students.map((row: any) => ({
        id: row.id,
        name: row.full_name,
        enrollmentNumber: row.enrollment_number,
        course: row.course_name,
        semester: row.current_semester,
      })),
    })
  } catch (error) {
    console.error("[MYT] Seminar students error:", error)
    return NextResponse.json({ success: false, message: "Failed to get seminar students" }, { status: 500 })
  }
}
