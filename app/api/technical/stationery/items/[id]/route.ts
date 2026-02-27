import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateTechnicalAuth, createTechnicalUnauthorizedResponse } from "@/lib/technical-auth"

// PUT: Update stationery item
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateTechnicalAuth(request)
  if (!authResult.success || !authResult.user) {
    return createTechnicalUnauthorizedResponse()
  }

  try {
    const itemId = Number.parseInt(params.id)
    const body = await request.json()
    const { name, description, total_quantity, unit } = body

    if (!name || !unit) {
      return NextResponse.json({ success: false, error: "Item name and unit are required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE stationery_inventory
      SET 
        name = ${name},
        description = ${description || null},
        total_quantity = ${Number.parseInt(total_quantity)},
        unit = ${unit},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${itemId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Stationery item updated successfully",
      item: {
        id: result[0].id,
        name: result[0].name,
        description: result[0].description,
        total_quantity: result[0].total_quantity,
        available_quantity: result[0].available_quantity,
        unit: result[0].unit,
      },
    })
  } catch (error) {
    console.error("Error updating stationery item:", error)
    return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 })
  }
}

// DELETE: Deactivate stationery item (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateTechnicalAuth(request)
  if (!authResult.success || !authResult.user) {
    return createTechnicalUnauthorizedResponse()
  }

  try {
    const itemId = Number.parseInt(params.id)

    const result = await sql`
      DELETE FROM stationery_inventory
      WHERE id = ${itemId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Stationery item deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting stationery item:", error)
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 })
  }
}
