import { neon } from "@neondatabase/serverless"
import { validateAdminAuth } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const authResult = await validateAdminAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Get all assignments across all subjects
    const assignments = await sql`
      SELECT 
        a.id,
        a.subject_id,
        a.title,
        a.description,
        a.total_marks,
        a.status,
        a.created_at,
        s.name as subject_name,
        s.code as subject_code,
        c.name as course_name,
        s.semester,
        t.name as tutor_name,
        COUNT(DISTINCT am.id) as marks_submitted,
        COUNT(DISTINCT st.id) as total_students
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN tutors t ON a.tutor_id = t.id
      LEFT JOIN assignment_marks am ON a.id = am.assignment_id
      LEFT JOIN students st ON s.course_id = st.course_id AND s.semester = st.semester
      GROUP BY a.id, s.id, c.id, t.id
      ORDER BY a.created_at DESC
    `

    return Response.json({ success: true, assignments })
  } catch (error) {
    console.error("[MYT] Admin Assignments API: Error:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch assignments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
