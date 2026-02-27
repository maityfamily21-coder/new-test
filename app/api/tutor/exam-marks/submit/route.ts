import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { exam_id, subject_id, tutor_id, marks_data } = body

    if (!exam_id || !subject_id || !tutor_id || !Array.isArray(marks_data)) {
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
    let successCount = 0
    const errors = []

    for (const mark of marks_data) {
      const { student_id, marks_obtained } = mark

      if (!student_id || marks_obtained === null || marks_obtained === undefined) {
        errors.push(`Invalid data for student ${student_id}`)
        continue
      }

      const marksNum = Number(marks_obtained)
      if (isNaN(marksNum) || marksNum < 0 || marksNum > totalMarks) {
        errors.push(`Marks for student ${student_id} must be between 0 and ${totalMarks}`)
        continue
      }

      // Verify student was present
      const studentAttendance = await sql`
        SELECT id FROM exam_attendance 
        WHERE exam_id = ${exam_id} AND student_id = ${student_id} AND subject_id = ${subject_id} AND attendance_status = 'present'
      `

      if (!studentAttendance || studentAttendance.length === 0) {
        errors.push(`Student ${student_id} was not marked present in this exam/subject`)
        continue
      }

      await sql`
        INSERT INTO exam_marks (exam_id, student_id, subject_id, tutor_id, total_marks, marks_obtained, status, submission_date)
        VALUES (${exam_id}, ${student_id}, ${subject_id}, ${tutor_id}, ${totalMarks}, ${marksNum}, 'submitted', NOW())
        ON CONFLICT (exam_id, student_id, subject_id)
        DO UPDATE SET 
          marks_obtained = ${marksNum}, 
          status = 'submitted', 
          submission_date = NOW(),
          tutor_id = ${tutor_id}
      `

      successCount++
    }

    // Mark assignment as completed
    await sql`
      UPDATE exam_marks_assignment 
      SET is_completed = TRUE, completed_date = NOW()
      WHERE exam_id = ${exam_id} AND subject_id = ${subject_id} AND tutor_id = ${tutor_id}
    `

    return Response.json({
      success: true,
      message: `Marks submitted for ${successCount} students`,
      submitted_count: successCount,
      errors: errors.length > 0 ? errors : null,
    })
  } catch (error) {
    console.error("[MYT] Error submitting marks:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
