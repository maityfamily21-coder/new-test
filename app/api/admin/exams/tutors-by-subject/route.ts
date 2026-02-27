import { neon } from "@neondatabase/serverless"
import { validateAdminAuth } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const admin = await validateAdminAuth(request)
    if (!admin) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subject_id, exam_id } = body

    console.log("[v0] tutors-by-subject API called with:", { subject_id, exam_id })

    if (!subject_id) {
      return Response.json({ success: false, message: "Subject ID is required" }, { status: 400 })
    }

    // Get ALL tutors - any tutor can be assigned to mark entries for any subject
    const tutors = await sql`
      SELECT 
        t.id,
        t.name,
        t.department
      FROM tutors t
      ORDER BY t.name
    `

    console.log("[v0] Fetching all tutors for exam:", exam_id, "subject:", subject_id)
    console.log("[v0] Total tutors available:", tutors.length)

    return Response.json({
      success: true,
      tutors: Array.isArray(tutors) ? tutors : [],
    })
  } catch (error) {
    console.error("[v0] Error fetching tutors by subject:", error)
    return Response.json(
      { success: false, message: "Internal server error", error: String(error) },
      { status: 500 }
    )
  }
}
