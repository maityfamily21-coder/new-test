import { neon } from "@neondatabase/serverless"
import { validateTutorAuth } from "@/lib/tutor-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateTutorAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tutorId = authResult.tutor.id
    const assignmentId = Number.parseInt(params.id)

    const assignment = await sql`
      SELECT 
        a.id,
        a.subject_id,
        a.title,
        a.description,
        a.total_marks,
        a.status,
        a.created_at,
        a.updated_at,
        s.name as subject_name,
        s.code as subject_code,
        c.name as course_name,
        s.semester
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE a.id = ${assignmentId} AND a.tutor_id = ${tutorId}
    `

    if (assignment.length === 0) {
      return Response.json({ success: false, error: "Assignment not found" }, { status: 404 })
    }

    return Response.json({ success: true, assignment: assignment[0] })
  } catch (error) {
    console.error("[MYT] Assignment API: Error fetching assignment:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch assignment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateTutorAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tutorId = authResult.tutor.id
    const assignmentId = Number.parseInt(params.id)
    const { status } = await request.json()

    // Verify ownership
    const assignment = await sql`
      SELECT id FROM assignments WHERE id = ${assignmentId} AND tutor_id = ${tutorId}
    `

    if (assignment.length === 0) {
      return Response.json({ success: false, error: "Assignment not found" }, { status: 404 })
    }

    if (status === "Ended") {
      const result = await sql`
        UPDATE assignments SET status = 'Ended', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${assignmentId}
        RETURNING id, status
      `
      return Response.json({ success: true, assignment: result[0] })
    }

    return Response.json({ success: false, error: "Invalid status" }, { status: 400 })
  } catch (error) {
    console.error("[MYT] Assignment API: Error updating assignment:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to update assignment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateTutorAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tutorId = authResult.tutor.id
    const assignmentId = Number.parseInt(params.id)

    // Verify ownership
    const assignment = await sql`
      SELECT id FROM assignments WHERE id = ${assignmentId} AND tutor_id = ${tutorId}
    `

    if (assignment.length === 0) {
      return Response.json({ success: false, error: "Assignment not found" }, { status: 404 })
    }

    await sql`DELETE FROM assignments WHERE id = ${assignmentId}`

    return Response.json({ success: true, message: "Assignment deleted successfully" })
  } catch (error) {
    console.error("[MYT] Assignment API: Error deleting assignment:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to delete assignment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
