import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)
    const { token } = await request.json()

    if (!token) {
      return Response.json({ success: false, error: "Invalid QR token" }, { status: 400 })
    }

    console.log("[MYT] Processing QR attendance for lecture:", lectureId, "token:", token)

    // Get student data from QR token
    const studentQrData = await sql`
      SELECT student_id FROM student_qr_tokens WHERE token = ${token}
    `

    if (studentQrData.length === 0) {
      console.log("[MYT] Invalid QR token:", token)
      return Response.json({ success: false, error: "Invalid QR code" }, { status: 400 })
    }

    const studentId = studentQrData[0].student_id

    // Get lecture details
    const lecture = await sql`
      SELECT l.id, l.subject_id, s.course_id, s.semester
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      WHERE l.id = ${lectureId}
    `

    if (lecture.length === 0) {
      return Response.json({ success: false, error: "Lecture not found" }, { status: 404 })
    }

    const { course_id, semester } = lecture[0]

    // Verify student belongs to this course and semester
    const student = await sql`
      SELECT id, full_name FROM students 
      WHERE id = ${studentId} AND course_id = ${course_id} AND current_semester = ${semester}
    `

    if (student.length === 0) {
      console.log("[MYT] Student not part of this lecture's course/semester")
      return Response.json(
        { success: false, error: "Student not part of this lecture", studentName: "Unknown" },
        { status: 400 },
      )
    }

    const studentName = student[0].full_name

    // Check if already marked
    const existing = await sql`
      SELECT id FROM lecture_attendance 
      WHERE lecture_id = ${lectureId} AND student_id = ${studentId}
    `

    if (existing.length > 0) {
      console.log("[MYT] Attendance already marked for student:", studentId)
      return Response.json(
        { success: false, error: "Already marked", message: `Already marked: ${studentName}`, studentName },
        { status: 400 },
      )
    }

    // Mark attendance as Present
    await sql`
      INSERT INTO lecture_attendance (lecture_id, student_id, status)
      VALUES (${lectureId}, ${studentId}, 'Present')
    `

    console.log("[MYT] Attendance marked for student:", studentId, studentName)
    return Response.json({
      success: true,
      message: `Marked: ${studentName}`,
      studentName,
      studentId,
    })
  } catch (error) {
    console.error("[MYT] Error processing QR attendance:", error)
    return Response.json({ success: false, error: "Failed to process QR code" }, { status: 500 })
  }
}
