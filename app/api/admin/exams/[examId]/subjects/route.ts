import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const examIdNum = Number.parseInt(params.examId)

    if (isNaN(examIdNum)) {
      console.error("[MYT] Invalid exam ID:", params.examId)
      return Response.json({ error: "Invalid exam ID" }, { status: 400 })
    }

    console.log("[MYT] Fetching subjects for exam ID:", examIdNum)

    const subjects = await sql`
      SELECT 
        s.id, 
        s.name,
        s.code,
        es.total_marks,
        es.exam_date
      FROM exam_subjects es
      JOIN subjects s ON es.subject_id = s.id
      WHERE es.exam_id = ${examIdNum}
      ORDER BY s.name
    `

    console.log("[MYT] Found subjects:", subjects?.length || 0, subjects)

    return Response.json(subjects || [])
  } catch (error: any) {
    console.error("[MYT] Error fetching exam subjects:", error.message, error)
    return Response.json({ error: "Failed to fetch subjects", details: error.message }, { status: 500 })
  }
}
