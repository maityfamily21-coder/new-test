import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    let { exam_id, student_id, subject_id, course_id, semester, markedByPersonnelId } = body

    exam_id = Number(exam_id)
    student_id = Number(student_id)
    subject_id = Number(subject_id)
    course_id = Number(course_id)
    semester = Number(semester)

    const markedByType = markedByPersonnelId ? "personnel" : "admin"
    const markedById = markedByPersonnelId || null

    console.log("[MYT] Marking attendance with:", {
      exam_id,
      student_id,
      subject_id,
      course_id,
      semester,
      markedByType,
      markedById,
    })

    if (!exam_id || isNaN(exam_id) || !student_id || isNaN(student_id) || !subject_id || isNaN(subject_id)) {
      console.error("[MYT] Invalid IDs - exam:", exam_id, "student:", student_id, "subject:", subject_id)
      return Response.json(
        { success: false, message: "Missing or invalid required fields (exam_id, student_id, subject_id)" },
        { status: 400 },
      )
    }

    if (course_id && semester && !isNaN(course_id) && !isNaN(semester)) {
      const studentVerify = await sql`
        SELECT id, full_name FROM students 
        WHERE id = ${student_id} AND course_id = ${course_id} AND current_semester = ${semester}
      `

      if (studentVerify.length === 0) {
        console.log(
          "[MYT] Student verification failed - student:",
          student_id,
          "course:",
          course_id,
          "semester:",
          semester,
        )
        return Response.json(
          { success: false, message: "Student does not belong to the selected course/semester" },
          { status: 403 },
        )
      }
    }

    const examVerify = await sql`
      SELECT e.id, e.exam_name FROM exams e
      WHERE e.id = ${exam_id}
    `

    if (examVerify.length === 0) {
      console.log("[MYT] Exam not found - exam_id:", exam_id)
      return Response.json({ success: false, message: "Exam does not exist in the system" }, { status: 403 })
    }

    const examName = examVerify[0].exam_name

    const examSubjectVerify = await sql`
      SELECT es.id FROM exam_subjects es
      WHERE es.exam_id = ${exam_id} AND es.subject_id = ${subject_id}
    `

    if (examSubjectVerify.length === 0) {
      console.log("[MYT] Subject not in exam - exam:", exam_id, "subject:", subject_id)
      return Response.json({ success: false, message: `Subject does not exist in exam "${examName}"` }, { status: 403 })
    }

    const subjectVerify = await sql`
      SELECT id, name FROM subjects 
      WHERE id = ${subject_id} AND course_id = ${course_id} AND semester = ${semester}
    `

    if (subjectVerify.length === 0) {
      console.log(
        "[MYT] Subject not found for course/semester - subject:",
        subject_id,
        "course:",
        course_id,
        "semester:",
        semester,
      )
      return Response.json(
        { success: false, message: "This subject is not available for the selected course/semester" },
        { status: 403 },
      )
    }

    const existingAttendance = await sql`
      SELECT id, attendance_status FROM exam_attendance 
      WHERE exam_id = ${exam_id} AND student_id = ${student_id} AND subject_id = ${subject_id}
    `

    if (existingAttendance.length > 0) {
      console.log("[MYT] Attendance already marked for student:", student_id, "exam:", exam_id, "subject:", subject_id)
      return Response.json(
        { success: true, message: "Attendance already marked for this student in this exam/subject" },
        { status: 200 },
      )
    }

    await sql`
      INSERT INTO exam_attendance (exam_id, student_id, subject_id, attendance_status, scanned_at, marked_by_type, marked_by_id)
      VALUES (${exam_id}, ${student_id}, ${subject_id}, 'present', NOW(), ${markedByType}, ${markedById})
      ON CONFLICT (exam_id, student_id, subject_id) 
      DO UPDATE SET attendance_status = 'present', scanned_at = NOW(), marked_by_type = ${markedByType}, marked_by_id = ${markedById}
    `

    const studentInfo = await sql`
      SELECT full_name, enrollment_number FROM students WHERE id = ${student_id}
    `

    console.log(
      "[MYT] Attendance marked successfully for student:",
      student_id,
      "exam:",
      exam_id,
      "subject:",
      subject_id,
      "by:",
      markedByType,
    )

    return Response.json({
      success: true,
      message: "Attendance marked successfully",
      student_name: studentInfo[0]?.full_name,
      enrollment_number: studentInfo[0]?.enrollment_number,
    })
  } catch (error) {
    console.error("[MYT] Error marking attendance:", error)
    return Response.json(
      {
        success: false,
        message: "Failed to mark attendance: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    )
  }
}
