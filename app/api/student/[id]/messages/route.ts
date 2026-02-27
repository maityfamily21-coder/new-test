import { type NextRequest, NextResponse } from "next/server"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateStudentAuth(request)
    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const authenticatedStudent = authResult.student
    const requestedStudentId = Number.parseInt(params.id)

    if (!authenticatedStudent || authenticatedStudent.id !== requestedStudentId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only view your own messages" },
        { status: 403 },
      )
    }

    const studentId = requestedStudentId

    // Get student details
    const student = await sql`
      SELECT course_id, current_semester FROM students WHERE id = ${studentId}
    `

    if (student.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const { course_id, current_semester } = student[0]

    // Get student's interests
    const studentInterests = await sql`
      SELECT interest_id FROM student_interests WHERE student_id = ${studentId}
    `

    const interestIds = studentInterests.map((si: any) => si.interest_id)

    // Get messages for student (by interest or course/semester)
    let messages: any[] = []

    if (interestIds.length > 0) {
      const interestMessages = await sql`
        SELECT 
          m.*,
          i.name as interest_name,
          NULL as course_name,
          NULL as semester
        FROM messages m
        JOIN interests i ON m.interest_id = i.id
        WHERE m.message_type = 'interest' 
        AND m.interest_id = ANY(${interestIds})
      `
      messages = [...messages, ...interestMessages]
    }

    const courseSemesterMessages = await sql`
      SELECT 
        m.*,
        NULL as interest_name,
        c.name as course_name,
        mcs.semester
      FROM messages m
      JOIN message_course_semesters mcs ON m.id = mcs.message_id
      JOIN courses c ON mcs.course_id = c.id
      WHERE m.message_type = 'course_semester'
      AND mcs.course_id = ${course_id}
      AND mcs.semester = ${current_semester}
      
      UNION
      
      SELECT 
        m.*,
        NULL as interest_name,
        c.name as course_name,
        m.semester
      FROM messages m
      JOIN courses c ON m.course_id = c.id
      WHERE m.message_type = 'course_semester'
      AND m.course_id = ${course_id}
      AND m.semester = ${current_semester}
      AND NOT EXISTS (
        SELECT 1 FROM message_course_semesters mcs 
        WHERE mcs.message_id = m.id
      )
    `

    const personalMessages = await sql`
      SELECT
        m.*,
        NULL as interest_name,
        NULL as course_name,
        NULL as semester
      FROM messages m
      INNER JOIN message_recipients mr ON mr.message_id = m.id
      WHERE m.message_type = 'students'
        AND mr.student_id = ${studentId}
    `

    messages = [...messages, ...courseSemesterMessages, ...personalMessages]

    // Sort by created_at desc
    messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ success: true, messages: messages.slice(0, 10) })
  } catch (error) {
    console.error("Student messages fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch messages" }, { status: 500 })
  }
}
