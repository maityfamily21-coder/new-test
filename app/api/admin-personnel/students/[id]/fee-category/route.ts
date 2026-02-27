import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = Number(params.id)
    const body = await request.json()
    const { fee_category } = body

    // Validate fee_category
    const validCategories = ["GENERAL", "FREESHIP", "SCHOLARSHIP", "EWS"]
    if (!fee_category || !validCategories.includes(fee_category)) {
      return Response.json(
        { success: false, message: "Invalid fee category" },
        { status: 400 }
      )
    }

    // Update student fee category
    const result = await sql`
      UPDATE students 
      SET fee_category = ${fee_category}
      WHERE id = ${studentId}
      RETURNING id, fee_category, full_name, enrollment_number
    `

    if (!result || result.length === 0) {
      return Response.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      message: "Fee category updated successfully",
      student: result[0],
    })
  } catch (error) {
    console.error("[v0] Error updating fee category:", error)
    return Response.json(
      { success: false, message: "Failed to update fee category" },
      { status: 500 }
    )
  }
}
