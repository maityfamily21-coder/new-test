import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const examIdNum = Number.parseInt(params.examId)

    // Get exam details
    const examData = await sql`
      SELECT e.id, e.exam_name, e.exam_date, e.course_id, e.semester
      FROM exams e
      WHERE e.id = ${examIdNum}
      LIMIT 1
    `

    if (!examData || examData.length === 0) {
      return Response.json({ error: "Exam not found" }, { status: 404 })
    }

    const exam = examData[0]

    // Get all subjects for this exam with QR token information
    const subjects = await sql`
      SELECT DISTINCT
        s.id,
        s.name,
        s.code,
        es.total_marks,
        es.exam_id,
        COUNT(eqt.id) as qr_token_count
      FROM exam_subjects es
      JOIN subjects s ON es.subject_id = s.id
      LEFT JOIN exam_qr_tokens eqt ON es.exam_id = eqt.exam_id 
        AND es.subject_id = eqt.subject_id
      WHERE es.exam_id = ${examIdNum}
      GROUP BY s.id, s.name, s.code, es.total_marks, es.exam_id
      ORDER BY s.name
    `

    return Response.json({
      exam: {
        id: exam.id,
        name: exam.exam_name,
        date: exam.exam_date,
        course_id: exam.course_id,
        semester: exam.semester,
      },
      subjects: subjects || [],
    })
  } catch (error: any) {
    console.error("[MYT] Error fetching subjects with QR:", error.message)
    return Response.json({ error: "Failed to fetch subjects", details: error.message }, { status: 500 })
  }
}
