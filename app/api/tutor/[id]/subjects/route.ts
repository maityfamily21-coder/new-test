import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const tutorId = Number.parseInt(params.id)
    console.log("[MYT] Tutor API: Fetching subjects for tutor ID:", tutorId)

    const tutorCheck = await sql`SELECT id FROM tutors WHERE id = ${tutorId}`
    if (tutorCheck.length === 0) {
      console.log("[MYT] Tutor API: Tutor not found with ID:", tutorId)
      return Response.json({ success: false, error: "Tutor not found" }, { status: 404 })
    }

    const subjects = await sql`
      SELECT 
        s.id,
        s.name,
        s.code,
        c.name as course_name,
        c.id as course_id,
        s.semester
      FROM subjects s
      JOIN tutor_subjects ts ON s.id = ts.subject_id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE ts.tutor_id = ${tutorId}
      ORDER BY c.name, s.semester, s.name
    `

    console.log("[MYT] Tutor API: Found subjects:", subjects.length)
    console.log("[MYT] Tutor API: Subject details:", subjects)

    const response = Response.json({ success: true, subjects })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("[MYT] Tutor API: Error fetching tutor subjects:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch subjects",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
