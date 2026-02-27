import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string; subjectId: string } }) {
  try {
    const examId = Number(params.examId)
    const subjectId = Number(params.subjectId)
    const { searchParams } = new URL(request.url)
    const tutorId = searchParams.get("tutorId")

    if (!tutorId) {
      return Response.json({ success: false, message: "Tutor ID required" }, { status: 400 })
    }

    // Verify tutor is assigned to this exam/subject
    const assignment = await sql`
      SELECT id FROM exam_marks_assignment 
      WHERE exam_id = ${examId} AND subject_id = ${subjectId} AND tutor_id = ${Number(tutorId)}
    `

    if (!assignment || assignment.length === 0) {
      return Response.json({ success: false, message: "Not authorized to access this exam/subject" }, { status: 403 })
    }

    // Get present students for marks entry
    const students = await sql`
      SELECT 
        st.id,
        st.full_name,
        st.enrollment_number,
        ea.attendance_status,
        em.marks_obtained,
        em.status as marks_status,
        em.submission_date
      FROM exam_attendance ea
      JOIN students st ON ea.student_id = st.id
      LEFT JOIN exam_marks em ON ea.exam_id = em.exam_id AND ea.student_id = em.student_id AND ea.subject_id = em.subject_id
      WHERE ea.exam_id = ${examId} AND ea.subject_id = ${subjectId} AND ea.attendance_status = 'present'
      ORDER BY st.full_name
    `

    return Response.json({
      success: true,
      students: students || [],
    })
  } catch (error) {
    console.error("[MYT] Error fetching students:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
