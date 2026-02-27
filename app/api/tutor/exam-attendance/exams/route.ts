import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const semester = searchParams.get("semester")

    if (!courseId || !semester) {
      return Response.json({ error: "Course ID and semester required" }, { status: 400 })
    }

    const exams = await sql`
      SELECT id, exam_name, exam_date, course_id, semester
      FROM exams
      WHERE course_id = ${Number(courseId)} 
        AND semester = ${Number(semester)}
      ORDER BY exam_date DESC, exam_name
    `

    return Response.json(exams)
  } catch (error) {
    console.error("[MYT] Error fetching exams:", error)
    return Response.json({ error: "Failed to fetch exams" }, { status: 500 })
  }
}
