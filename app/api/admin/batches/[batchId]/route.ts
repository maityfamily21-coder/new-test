import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const batchId = Number(params.batchId)

    const batch = await sql`
      SELECT 
        b.*,
        COUNT(DISTINCT bs.student_id) as assigned_students
      FROM batches b
      LEFT JOIN batch_students bs ON b.id = bs.batch_id
      WHERE b.id = ${batchId}
      GROUP BY b.id
    `

    if (!batch.length) {
      return Response.json({ success: false, error: "Batch not found" }, { status: 404 })
    }

    const students = await sql`
      SELECT s.id, s.full_name, s.enrollment_number, s.email, s.phone_number
      FROM batch_students bs
      JOIN students s ON bs.student_id = s.id
      WHERE bs.batch_id = ${batchId}
      ORDER BY s.full_name
    `

    return Response.json({ success: true, batch: batch[0], students })
  } catch (error) {
    console.error("[BATCH] Error fetching batch:", error)
    return Response.json({ success: false, error: "Failed to fetch batch" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const batchId = Number(params.batchId)
    const { batchName, description } = await request.json()

    const result = await sql`
      UPDATE batches
      SET batch_name = ${batchName}, description = ${description || null}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${batchId}
      RETURNING *
    `

    if (!result.length) {
      return Response.json({ success: false, error: "Batch not found" }, { status: 404 })
    }

    return Response.json({ success: true, batch: result[0] })
  } catch (error) {
    console.error("[BATCH] Error updating batch:", error)
    return Response.json({ success: false, error: "Failed to update batch" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const batchId = Number(params.batchId)

    // Delete batch_students first
    await sql`DELETE FROM batch_students WHERE batch_id = ${batchId}`

    // Then delete the batch
    const result = await sql`DELETE FROM batches WHERE id = ${batchId} RETURNING id`

    if (!result.length) {
      return Response.json({ success: false, error: "Batch not found" }, { status: 404 })
    }

    return Response.json({ success: true, message: "Batch deleted successfully" })
  } catch (error) {
    console.error("[BATCH] Error deleting batch:", error)
    return Response.json({ success: false, error: "Failed to delete batch" }, { status: 500 })
  }
}
