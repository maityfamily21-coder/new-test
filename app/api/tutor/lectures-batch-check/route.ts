import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Check if course-semester has batches
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")

    if (!subjectId) {
      return Response.json({ success: false, error: "subjectId required" }, { status: 400 })
    }

    // Get course and semester from subject
    const subject = await sql`
      SELECT course_id, semester FROM subjects WHERE id = ${Number(subjectId)}
    `

    if (!subject.length) {
      return Response.json({ success: false, error: "Subject not found" }, { status: 404 })
    }

    const { course_id, semester } = subject[0]

    // Check if batches exist for this course-semester
    const batches = await sql`
      SELECT id, batch_name, batch_number
      FROM batches
      WHERE course_id = ${course_id} AND semester = ${semester}
      ORDER BY batch_number ASC
    `

    return Response.json({
      success: true,
      hasBatches: batches.length > 0,
      batches,
      courseId: course_id,
      semester,
    })
  } catch (error) {
    console.error("[BATCH] Error checking batches:", error)
    return Response.json({ success: false, error: "Failed to check batches" }, { status: 500 })
  }
}
