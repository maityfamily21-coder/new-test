import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Get all tutor-subject assignments
    const assignments = await sql`
      SELECT ts.tutor_id, ts.subject_id, t.name as tutor_name, s.name as subject_name
      FROM tutor_subjects ts
      JOIN tutors t ON ts.tutor_id = t.id
      JOIN subjects s ON ts.subject_id = s.id
      ORDER BY ts.tutor_id
    `

    // Get all tutors
    const tutors = await sql`SELECT id, name FROM tutors`

    // Get all subjects
    const subjects = await sql`SELECT id, name, code FROM subjects`

    return Response.json({
      success: true,
      assignments,
      tutors,
      subjects,
      totalAssignments: assignments.length,
      totalTutors: tutors.length,
      totalSubjects: subjects.length,
    })
  } catch (error) {
    console.error("[MYT] Debug error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
