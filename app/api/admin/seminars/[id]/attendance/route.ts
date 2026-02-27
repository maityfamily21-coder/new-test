import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id

    // First, get the seminar details to determine its type (interest-based or course-semester based)
    const [seminar] = await sql`
      SELECT interest_id, course_id, semester
      FROM seminars
      WHERE id = ${seminarId}
    `

    if (!seminar) {
      return NextResponse.json({ success: false, message: "Seminar not found" }, { status: 404 })
    }

    let attendance: any[] = []

    if (seminar.interest_id) {
      // If it's an interest-based seminar, fetch students based on that interest
      attendance = await sql`
        SELECT 
          s.id as student_id,
          s.full_name as student_name,
          s.enrollment_number,
          s.course_id,
          c.name as course_name,
          s.current_semester as current_semester,
          COALESCE(sa.status, 'Absent') as status
        FROM students s
        JOIN student_interests si ON si.student_id = s.id
        JOIN courses c ON c.id = s.course_id
        LEFT JOIN seminar_attendance sa ON sa.seminar_id = ${seminarId} AND sa.student_id = s.id
        WHERE si.interest_id = ${seminar.interest_id}
        ORDER BY s.full_name
      `
    } else if (seminar.course_id && seminar.semester) {
      // If it's a course-semester based seminar, fetch students based on course_id and semester
      attendance = await sql`
        SELECT 
          s.id as student_id,
          s.full_name as student_name,
          s.enrollment_number,
          s.course_id,
          c.name as course_name,
          s.current_semester as current_semester,
          COALESCE(sa.status, 'Absent') as status
        FROM students s
        JOIN courses c ON c.id = s.course_id
        LEFT JOIN seminar_attendance sa ON sa.seminar_id = ${seminarId} AND sa.student_id = s.id
        WHERE s.course_id = ${seminar.course_id} AND s.current_semester = ${seminar.semester}
        ORDER BY s.full_name
      `
    } else {
      attendance = await sql`
        SELECT
          s.id AS student_id,
          s.full_name AS student_name,
          s.enrollment_number,
          s.course_id,
          c.name AS course_name,
          s.current_semester AS current_semester,
          COALESCE(sa.status, 'Absent') AS status
        FROM seminar_attendance sa
        JOIN students s ON s.id = sa.student_id
        JOIN courses c ON c.id = s.course_id
        WHERE sa.seminar_id = ${seminarId}
        ORDER BY s.full_name
      `
    }

    return NextResponse.json({ success: true, attendance }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Attendance fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch attendance" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id
    const { student_id, status } = await request.json()

    // Upsert attendance record
    await sql`
      INSERT INTO seminar_attendance (seminar_id, student_id, status)
      VALUES (${seminarId}, ${student_id}, ${status})
      ON CONFLICT (seminar_id, student_id)
      DO UPDATE SET status = ${status}
    `

    return NextResponse.json(
      { success: true, message: "Attendance updated successfully" },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Attendance update error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update attendance" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
