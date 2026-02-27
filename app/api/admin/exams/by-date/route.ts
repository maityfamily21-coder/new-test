import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return Response.json({ error: "Date parameter is required" }, { status: 400 })
    }

    // Format date to YYYY-MM-DD for comparison
    const formattedDate = new Date(date).toISOString().split("T")[0]
    console.log("[MYT] Fetching exams for date:", formattedDate)

    // Query all exams with subjects scheduled for the given date
    const exams = await sql`
      SELECT DISTINCT
        e.id as exam_id,
        e.exam_name,
        e.course_id,
        e.semester,
        es.subject_id,
        s.name as subject_name,
        es.exam_date,
        es.exam_end_time
      FROM exams e
      JOIN exam_subjects es ON e.id = es.exam_id
      JOIN subjects s ON es.subject_id = s.id
      WHERE DATE(es.exam_date) = ${formattedDate}
      ORDER BY e.id, es.subject_id
    `

    console.log("[MYT] Found exams:", exams?.length || 0)

    if (!exams || exams.length === 0) {
      return Response.json([])
    }

    return Response.json(exams)
  } catch (error) {
    console.error("[MYT] Error fetching exams by date:", error)
    return Response.json({ error: "Failed to fetch exams" }, { status: 500 })
  }
}
