import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const examId = searchParams.get("examId")

    if (!studentId) {
      return Response.json({ success: false, message: "Student ID required" }, { status: 400 })
    }

    let marks = []

    if (examId) {
      marks = await sql`
        SELECT 
          em.id,
          em.exam_id,
          e.exam_name,
          em.subject_id,
          s.name as subject_name,
          s.code,
          em.marks_obtained,
          em.total_marks,
          em.status,
          em.submission_date,
          ea.attendance_status
        FROM exam_marks em
        JOIN exams e ON em.exam_id = e.id
        JOIN subjects s ON em.subject_id = s.id
        LEFT JOIN exam_attendance ea ON em.exam_id = ea.exam_id AND em.student_id = ea.student_id AND em.subject_id = ea.subject_id
        WHERE em.student_id = ${Number(studentId)} AND em.exam_id = ${Number(examId)}
        ORDER BY e.exam_date DESC, s.name
      `
    } else {
      marks = await sql`
        SELECT 
          em.id,
          em.exam_id,
          e.exam_name,
          em.subject_id,
          s.name as subject_name,
          s.code,
          em.marks_obtained,
          em.total_marks,
          em.status,
          em.submission_date,
          ea.attendance_status
        FROM exam_marks em
        JOIN exams e ON em.exam_id = e.id
        JOIN subjects s ON em.subject_id = s.id
        LEFT JOIN exam_attendance ea ON em.exam_id = ea.exam_id AND em.student_id = ea.student_id AND em.subject_id = ea.subject_id
        WHERE em.student_id = ${Number(studentId)}
        ORDER BY e.exam_date DESC, s.name
      `
    }

    return Response.json({
      success: true,
      marks: marks || [],
    })
  } catch (error) {
    console.error("[MYT] Error fetching student marks:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
