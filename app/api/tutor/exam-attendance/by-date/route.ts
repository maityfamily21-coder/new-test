import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return Response.json({ error: "Date required" }, { status: 400 })
    }

    const exams = await sql`
      SELECT DISTINCT
        e.id as exam_id,
        e.exam_name,
        e.course_id,
        e.semester,
        es.subject_id,
        s.name as subject_name
      FROM exams e
      JOIN exam_subjects es ON e.id = es.exam_id
      JOIN subjects s ON es.subject_id = s.id
      WHERE DATE(es.exam_date) = ${date}
      ORDER BY es.exam_date, e.exam_name
    `

    return Response.json(exams)
  } catch (error) {
    console.error("[MYT] Error fetching exams by date:", error)
    return Response.json({ error: "Failed to fetch exams" }, { status: 500 })
  }
}
