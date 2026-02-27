import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateStudentAuth(request)
  if (!authResult.success) {
    return createStudentUnauthorizedResponse(authResult.error)
  }

  const authenticatedStudent = authResult.student

  try {
    const studentId = params.id

    if (authenticatedStudent && authenticatedStudent.id !== Number.parseInt(studentId)) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 })
    }

    // Get complete student profile with course information
    const students = await sql`
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        s.course_id,
        s.email,
        s.phone_number,
        s.parent_phone_number,
        s.admission_semester,
        s.current_semester,
        s.resume_link,
        s.agreement_link,
        s.placement_status,
        s.company_name,
        s.placement_tenure_days,
        s.unique_code,
        s.created_at,
        c.name as course_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = ${studentId}
    `

    if (students.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const student = students[0]

    // Get student interests
    const interests = await sql`
      SELECT i.id, i.name
      FROM interests i
      JOIN student_interests si ON i.id = si.interest_id
      WHERE si.student_id = ${studentId}
    `

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        interests: interests,
      },
    })
  } catch (error) {
    console.error("Student profile fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch profile" }, { status: 500 })
  }
}
