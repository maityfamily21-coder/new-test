import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)
    console.log("[MYT] Fetching attendance for lecture:", lectureId)

    const lecture = await sql`
      SELECT l.id, l.subject_id, l.batch_id, s.course_id, s.semester
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      WHERE l.id = ${lectureId}
    `

    if (lecture.length === 0) {
      console.log("[MYT] Lecture not found:", lectureId)
      return Response.json({ success: false, error: "Lecture not found" }, { status: 404 })
    }

    const { course_id, semester, batch_id } = lecture[0]
    console.log("[MYT] Lecture course_id:", course_id, "semester:", semester, "batch_id:", batch_id)

    let studentsQuery
    if (batch_id) {
      // For batch lectures: only show students in that batch
      studentsQuery = await sql`
        SELECT 
          st.id,
          st.full_name,
          st.enrollment_number,
          COALESCE(la.status, 'Not Marked') as attendance_status,
          t.name as marked_by_name
        FROM students st
        JOIN batch_students bs ON st.id = bs.student_id AND bs.batch_id = ${batch_id}
        LEFT JOIN lecture_attendance la ON st.id = la.student_id AND la.lecture_id = ${lectureId}
        LEFT JOIN tutors t ON la.marked_by_tutor_id = t.id
        WHERE st.course_id = ${course_id} AND st.current_semester = ${semester}
        ORDER BY st.full_name
      `
      console.log("[MYT] Fetching batch students:", studentsQuery.length)
    } else {
      // For non-batch lectures: show all course-semester students (original behavior)
      studentsQuery = await sql`
        SELECT 
          st.id,
          st.full_name,
          st.enrollment_number,
          COALESCE(la.status, 'Not Marked') as attendance_status,
          t.name as marked_by_name
        FROM students st
        LEFT JOIN lecture_attendance la ON st.id = la.student_id AND la.lecture_id = ${lectureId}
        LEFT JOIN tutors t ON la.marked_by_tutor_id = t.id
        WHERE st.course_id = ${course_id} AND st.current_semester = ${semester}
        ORDER BY st.full_name
      `
      console.log("[MYT] Fetching all course-semester students:", studentsQuery.length)
    }

    return Response.json({ success: true, students: studentsQuery })
  } catch (error) {
    console.error("[MYT] Error fetching attendance:", error)
    return Response.json({ success: false, error: "Failed to fetch attendance" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)
    const { attendance, tutorId } = await request.json() // Accepting tutorId from request

    if (!Array.isArray(attendance)) {
      return Response.json({ success: false, error: "Invalid attendance data" }, { status: 400 })
    }

    console.log("[MYT] Saving attendance for lecture:", lectureId, "records:", attendance.length)

    for (const record of attendance) {
      const { studentId, status } = record

      if (!["Present", "Absent"].includes(status)) {
        return Response.json({ success: false, error: "Invalid status" }, { status: 400 })
      }

      await sql`
        INSERT INTO lecture_attendance (lecture_id, student_id, status, marked_by_tutor_id)
        VALUES (${lectureId}, ${studentId}, ${status}, ${tutorId || null})
        ON CONFLICT (lecture_id, student_id) DO UPDATE
        SET status = ${status}, marked_by_tutor_id = ${tutorId || null}, updated_at = CURRENT_TIMESTAMP
      `
    }

    console.log("[MYT] Attendance saved successfully")
    return Response.json({ success: true, message: "Attendance saved successfully" })
  } catch (error) {
    console.error("[MYT] Error saving attendance:", error)
    return Response.json({ success: false, error: "Failed to save attendance" }, { status: 500 })
  }
}
