import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Get students in a batch
export async function GET(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const batchId = Number(params.batchId)

    const students = await sql`
      SELECT s.id, s.full_name, s.enrollment_number, s.email, s.phone_number, s.course_id, s.current_semester
      FROM batch_students bs
      JOIN students s ON bs.student_id = s.id
      WHERE bs.batch_id = ${batchId}
      ORDER BY s.full_name
    `

    return Response.json({ success: true, students })
  } catch (error) {
    console.error("[BATCH] Error fetching batch students:", error)
    return Response.json({ success: false, error: "Failed to fetch students" }, { status: 500 })
  }
}

// Add students to batch
export async function POST(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const batchId = Number(params.batchId)
    const { studentIds } = await request.json()

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return Response.json({ success: false, error: "studentIds array required" }, { status: 400 })
    }

    let addedCount = 0
    for (const studentId of studentIds) {
      try {
        await sql`
          INSERT INTO batch_students (batch_id, student_id)
          VALUES (${batchId}, ${studentId})
          ON CONFLICT (batch_id, student_id) DO NOTHING
        `
        addedCount++
      } catch (err) {
        // Continue with next student if one fails due to duplicate
        continue
      }
    }

    // Update total_students count
    const countResult = await sql`
      SELECT COUNT(*) as count FROM batch_students WHERE batch_id = ${batchId}
    `

    await sql`
      UPDATE batches SET total_students = ${countResult[0].count} WHERE id = ${batchId}
    `

    return Response.json({ success: true, addedStudents: addedCount })
  } catch (error) {
    console.error("[BATCH] Error adding students to batch:", error)
    return Response.json({ success: false, error: "Failed to add students" }, { status: 500 })
  }
}

// Remove students from batch
export async function DELETE(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const batchId = Number(params.batchId)
    const { studentIds } = await request.json()

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return Response.json({ success: false, error: "studentIds array required" }, { status: 400 })
    }

    await sql`
      DELETE FROM batch_students 
      WHERE batch_id = ${batchId} AND student_id = ANY(${studentIds}::int[])
    `

    // Update total_students count
    const countResult = await sql`
      SELECT COUNT(*) as count FROM batch_students WHERE batch_id = ${batchId}
    `

    await sql`
      UPDATE batches SET total_students = ${countResult[0].count} WHERE id = ${batchId}
    `

    return Response.json({ success: true, removedStudents: studentIds.length })
  } catch (error) {
    console.error("[BATCH] Error removing students from batch:", error)
    return Response.json({ success: false, error: "Failed to remove students" }, { status: 500 })
  }
}
