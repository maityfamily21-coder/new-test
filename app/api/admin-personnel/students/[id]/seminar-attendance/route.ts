import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = params.id

    // Get student's interests, course, and current semester
    const [studentInfo] = await sql`
      SELECT s.course_id, s.current_semester, ARRAY_AGG(si.interest_id) as interest_ids
      FROM students s
      LEFT JOIN student_interests si ON s.id = si.student_id
      WHERE s.id = ${studentId}
      GROUP BY s.id, s.course_id, s.current_semester
    `

    if (!studentInfo) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const { course_id, current_semester, interest_ids } = studentInfo

    // Check if course_id/semester columns exist in seminars table (support legacy schema)
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seminars' AND (column_name = 'course_id' OR column_name = 'semester');
    `
    const hasCourseId = columns.some((col: any) => col.column_name === "course_id")
    const hasSemester = columns.some((col: any) => col.column_name === "semester")

    let seminars: Array<{ id: number; title: string; seminar_date: string; status: string | null }> = []

    if (hasCourseId && hasSemester) {
      // This ensures we only show seminars relevant to the student's course and semester
      seminars = await sql`
        SELECT 
          s.id,
          s.title,
          s.seminar_date,
          sa.status
        FROM seminars s
        LEFT JOIN seminar_attendance sa 
          ON s.id = sa.seminar_id 
         AND sa.student_id = ${studentId}
        WHERE 
          -- Interest-based seminars: student has the interest
          (s.interest_id = ANY(${interest_ids || []}) AND s.interest_id IS NOT NULL)
          OR
          -- Course-semester seminars via seminar_course_semesters table
          (
            EXISTS (
              SELECT 1 FROM seminar_course_semesters scs
              WHERE scs.seminar_id = s.id 
              AND scs.course_id = ${course_id}
              AND scs.semester = ${current_semester}
            )
          )
          OR
          -- Specific student seminars: student is in the selected list
          (
            EXISTS (
              SELECT 1 FROM seminar_students ss
              WHERE ss.seminar_id = s.id
              AND ss.student_id = ${studentId}
            )
          )
        ORDER BY s.seminar_date DESC
      `
    } else {
      // Legacy: only interest-based seminars
      seminars = await sql`
        SELECT 
          s.id,
          s.title,
          s.seminar_date,
          sa.status
        FROM seminars s
        LEFT JOIN seminar_attendance sa 
          ON s.id = sa.seminar_id 
         AND sa.student_id = ${studentId}
        WHERE s.interest_id = ANY(${interest_ids || []})
        ORDER BY s.seminar_date DESC
      `
    }

    const total = seminars.length
    const attendedSeminars = seminars.filter((s) => (s.status ?? "Absent") === "Present")
    const attended = attendedSeminars.length
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0

    return NextResponse.json({
      success: true,
      summary: {
        total,
        attended,
        percentage,
        attendedSeminars: attendedSeminars.map((s) => ({
          id: s.id,
          title: s.title,
          seminar_date: s.seminar_date,
        })),
      },
    })
  } catch (error: any) {
    console.error("[MYT] Seminar attendance summary error:", error)
    return NextResponse.json({ success: false, message: "Failed to load attendance summary" }, { status: 500 })
  }
}
