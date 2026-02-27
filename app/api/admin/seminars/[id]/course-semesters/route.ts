import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id
    // Derive combos from enrolled/attendance list to support unified QR for multi-course seminars
    const combos = await sql`
      SELECT
        s.course_id,
        c.name AS course_name,
        s.current_semester AS semester
      FROM seminar_attendance sa
      JOIN students s ON s.id = sa.student_id
      JOIN courses c ON c.id = s.course_id
      WHERE sa.seminar_id = ${seminarId}
      GROUP BY s.course_id, c.name, s.current_semester
      ORDER BY c.name ASC, s.current_semester ASC
    `
    return NextResponse.json({ success: true, combos })
  } catch (error) {
    console.error("course-semesters fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch course-semester list" }, { status: 500 })
  }
}
