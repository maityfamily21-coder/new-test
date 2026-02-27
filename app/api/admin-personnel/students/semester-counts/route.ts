import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id")

    const rows =
      courseId && courseId !== "all"
        ? await sql`
          SELECT s.course_id, s.current_semester AS semester, COUNT(*)::int AS count
          FROM students s
          WHERE s.course_id = ${Number.parseInt(courseId)}
          GROUP BY s.course_id, s.current_semester
          ORDER BY s.course_id, s.current_semester
        `
        : await sql`
          SELECT s.course_id, s.current_semester AS semester, COUNT(*)::int AS count
          FROM students s
          GROUP BY s.course_id, s.current_semester
          ORDER BY s.course_id, s.current_semester
        `

    return NextResponse.json({ success: true, counts: rows })
  } catch (error) {
    console.error("[MYT] semester-counts error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch counts" }, { status: 500 })
  }
}
