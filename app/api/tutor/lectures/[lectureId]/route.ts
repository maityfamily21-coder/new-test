import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// IMPORTANT: params must match the folder name [lectureId], so we use params.lectureId

export async function GET(request: Request, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)

    if (isNaN(lectureId)) {
      return Response.json({ success: false, error: "Invalid ID" }, { status: 400 })
    }

    const lecture = await sql`
      SELECT * FROM lectures WHERE id = ${lectureId}
    `

    if (lecture.length === 0) {
      return Response.json({ success: false, error: "Lecture not found" }, { status: 404 })
    }

    return Response.json({ success: true, lecture: lecture[0] })
  } catch (error) {
    console.error("Error fetching lecture:", error)
    return Response.json({ success: false, error: "Failed to fetch lecture" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)
    const { title, description, lectureDate } = await request.json()

    if (isNaN(lectureId)) {
      return Response.json({ success: false, error: "Invalid ID" }, { status: 400 })
    }

    const result = await sql`
      UPDATE lectures
      SET title = ${title}, description = ${description || null}, lecture_date = ${lectureDate}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${lectureId}
      RETURNING id, title, description, lecture_date
    `

    if (result.length === 0) {
      return Response.json({ success: false, error: "Lecture not found" }, { status: 404 })
    }

    return Response.json({ success: true, lecture: result[0] })
  } catch (error) {
    console.error("Error updating lecture:", error)
    return Response.json({ success: false, error: "Failed to update lecture" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)

    if (isNaN(lectureId)) {
      return Response.json({ success: false, error: "Invalid ID" }, { status: 400 })
    }

    // 1. Delete from ALL related tables first to prevent errors
    await sql`DELETE FROM lecture_attendance WHERE lecture_id = ${lectureId}`
    await sql`DELETE FROM lecture_tutors WHERE lecture_id = ${lectureId}` // Added this line

    // 2. Now delete the lecture
    await sql`DELETE FROM lectures WHERE id = ${lectureId}`

    return Response.json({ success: true, message: "Lecture deleted successfully" })
  } catch (error) {
    console.error("Error deleting lecture:", error)
    return Response.json({ success: false, error: "Failed to delete lecture" }, { status: 500 })
  }
}
