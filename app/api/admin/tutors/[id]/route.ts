import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const tutor = await sql`
      SELECT * FROM tutors WHERE id = ${Number.parseInt(params.id)}
    `
    if (tutor.length === 0) {
      return Response.json({ success: false, error: "Tutor not found" }, { status: 404 })
    }
    return Response.json({ success: true, tutor: tutor[0] })
  } catch (error) {
    console.error("Error fetching tutor:", error)
    return Response.json({ success: false, error: "Failed to fetch tutor" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { name, username, department, faculty_type, password } = await request.json()
    const tutorId = Number.parseInt(params.id)

    const result = await sql`
      UPDATE tutors
      SET 
        name = ${name}, 
        username = ${username},
        department = ${department}, 
        faculty_type = ${faculty_type},
        password = CASE WHEN ${password} != '' THEN ${password} ELSE password END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${tutorId}
      RETURNING id, name, username, department, faculty_type
    `

    if (result.length === 0) {
      return Response.json({ success: false, error: "Tutor not found" }, { status: 404 })
    }

    return Response.json({ success: true, tutor: result[0] })
  } catch (error) {
    console.error("Error updating tutor:", error)
    return Response.json({ success: false, error: "Failed to update tutor" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const tutorId = Number.parseInt(params.id)

    await sql`DELETE FROM tutor_subjects WHERE tutor_id = ${tutorId}`
    await sql`DELETE FROM tutors WHERE id = ${tutorId}`

    return Response.json({ success: true, message: "Tutor deleted successfully" })
  } catch (error) {
    console.error("Error deleting tutor:", error)
    return Response.json({ success: false, error: "Failed to delete tutor" }, { status: 500 })
  }
}
