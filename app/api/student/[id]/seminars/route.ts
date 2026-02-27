import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // --- 1. NEW AUTH CHECK ---
    const authResult = await validateStudentAuth(request)
    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const authenticatedStudent = authResult.student
    const requestedStudentId = Number.parseInt(params.id)

    // --- 2. OWNERSHIP CHECK ---
    if (!authenticatedStudent || authenticatedStudent.id !== requestedStudentId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only view your own seminars" },
        { status: 403 },
      )
    }

    const studentId = requestedStudentId

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

    // Determine if course_id and semester columns exist in the seminars table
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seminars' AND (column_name = 'course_id' OR column_name = 'semester' OR column_name = 'speaker_name');
    `
    const hasCourseId = columns.some((col: any) => col.column_name === "course_id")
    const hasSemester = columns.some((col: any) => col.column_name === "semester")
    const hasSpeakerName = columns.some((col: any) => col.column_name === "speaker_name")

    let seminars: any[] = []

    if (hasCourseId && hasSemester) {
      seminars = await sql`
        SELECT 
          s.id, 
          s.title, 
          s.description, 
          s.seminar_date, 
          s.created_at,
          s.interest_id,
          i.name as interest_name,
          s.course_id,
          c.name as course_name,
          s.semester,
          ${hasSpeakerName ? sql`s.speaker_name,` : sql`NULL as speaker_name,`}
          sa.status as attendance_status,
          sr.rating as my_rating,
          sr.comment as my_comment
        FROM seminars s
        LEFT JOIN interests i ON s.interest_id = i.id
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN seminar_attendance sa ON s.id = sa.seminar_id AND sa.student_id = ${studentId}
        LEFT JOIN seminar_ratings sr ON s.id = sr.seminar_id AND sr.student_id = ${studentId}
        WHERE 
          (s.interest_id = ANY(${interest_ids || []}) AND s.interest_id IS NOT NULL)
          OR
          (
            EXISTS (
              SELECT 1 FROM seminar_course_semesters scs
              WHERE scs.seminar_id = s.id 
              AND scs.course_id = ${course_id}
              AND scs.semester = ${current_semester}
            )
          )
          OR
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
      seminars = await sql`
        SELECT 
          s.id, 
          s.title, 
          s.description, 
          s.seminar_date, 
          s.created_at,
          s.interest_id,
          i.name as interest_name,
          sa.status as attendance_status,
          sr.rating as my_rating,
          sr.comment as my_comment
        FROM seminars s
        LEFT JOIN interests i ON s.interest_id = i.id
        LEFT JOIN seminar_attendance sa ON s.id = sa.seminar_id AND sa.student_id = ${studentId}
        LEFT JOIN seminar_ratings sr ON s.id = sr.seminar_id AND sr.student_id = ${studentId}
        WHERE 
          (s.interest_id = ANY(${interest_ids || []}) AND s.interest_id IS NOT NULL)
          OR
          (
            EXISTS (
              SELECT 1 FROM seminar_students ss
              WHERE ss.seminar_id = s.id
              AND ss.student_id = ${studentId}
            )
          )
        ORDER BY s.seminar_date DESC
      `
    }

    return NextResponse.json({ success: true, seminars })
  } catch (error) {
    console.error("Student seminars fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch student seminars" }, { status: 500 })
  }
}
