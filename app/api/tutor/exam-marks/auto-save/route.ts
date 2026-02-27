import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { exam_id, subject_id, tutor_id, student_id, marks_obtained } = body

    if (!exam_id || !subject_id || !tutor_id || !student_id) {
      return Response.json({ success: false, message: "Invalid request data" }, { status: 400 })
    }

    // Verify tutor is assigned
    const assignment = await sql`
      SELECT id FROM exam_marks_assignment 
      WHERE exam_id = ${exam_id} AND subject_id = ${subject_id} AND tutor_id = ${tutor_id}
    `

    if (!assignment || assignment.length === 0) {
      return Response.json({ success: false, message: "Tutor not assigned to this exam/subject" }, { status: 403 })
    }

    // Get total marks for validation
    const examSubject = await sql`
      SELECT total_marks FROM exam_subjects 
      WHERE exam_id = ${exam_id} AND subject_id = ${subject_id}
    `

    if (!examSubject || examSubject.length === 0) {
      return Response.json({ success: false, message: "Exam subject not found" }, { status: 404 })
    }

    const totalMarks = examSubject[0].total_marks

    // Validate marks if provided
    if (marks_obtained !== null && marks_obtained !== undefined) {
      const marksNum = Number(marks_obtained)
      if (isNaN(marksNum) || marksNum < 0 || marksNum > totalMarks) {
        return Response.json({ success: false, message: `Marks must be between 0 and ${totalMarks}` }, { status: 400 })
      }
    }

    // Verify student was present
    const studentAttendance = await sql`
      SELECT id FROM exam_attendance 
      WHERE exam_id = ${exam_id} AND student_id = ${student_id} AND subject_id = ${subject_id} AND attendance_status = 'present'
    `

    if (!studentAttendance || studentAttendance.length === 0) {
      return Response.json(
        { success: false, message: "Student was not marked present in this exam/subject" },
        { status: 400 },
      )
    }

    // Update marks in draft status (not submitted yet)
    await sql`
      UPDATE exam_marks 
      SET marks_obtained = ${marks_obtained}, status = 'draft', updated_at = NOW()
      WHERE exam_id = ${exam_id} AND student_id = ${student_id} AND subject_id = ${subject_id}
    `

    return Response.json({
      success: true,
      message: "Mark auto-saved successfully",
    })
  } catch (error) {
    console.error("[MYT] Error auto-saving mark:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
