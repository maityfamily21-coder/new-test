import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const examId = params.examId

    const subjects = await sql`
      SELECT DISTINCT
        s.id,
        s.name,
        s.code,
        es.exam_date,
        es.exam_end_time,
        es.total_marks
      FROM exam_subjects es
      JOIN subjects s ON es.subject_id = s.id
      WHERE es.exam_id = ${Number(examId)}
      ORDER BY s.name
    `

    return Response.json(subjects)
  } catch (error) {
    console.error("[MYT] Error fetching subjects:", error)
    return Response.json({ error: "Failed to fetch subjects" }, { status: 500 })
  }
}
