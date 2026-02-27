import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateTechnicalAuth, createTechnicalUnauthorizedResponse } from "@/lib/technical-auth"

// GET: Retrieve all stationery items
export async function GET(request: NextRequest) {
  const authResult = await validateTechnicalAuth(request)
  if (!authResult.success || !authResult.user) {
    // console.log("[MYT] Technical auth failed in GET items:", authResult.error)
    return createTechnicalUnauthorizedResponse()
  }

  try {
    const items = await sql`
      SELECT 
        id, 
        name, 
        description, 
        total_quantity, 
        available_quantity, 
        unit, 
        created_at,
        updated_at
      FROM stationery_inventory
      ORDER BY name ASC
    `

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        total_quantity: item.total_quantity,
        available_quantity: item.available_quantity,
        unit: item.unit,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    })
  } catch (error) {
    console.error("Error fetching stationery items:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch items" }, { status: 500 })
  }
}

// POST: Add new stationery item
export async function POST(request: NextRequest) {
  const authResult = await validateTechnicalAuth(request)
  if (!authResult.success || !authResult.user) {
    // console.log("[MYT] Technical auth failed in POST items:", authResult.error)
    return createTechnicalUnauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { name, description, total_quantity, unit } = body

    if (!name || !total_quantity || !unit) {
      return NextResponse.json(
        { success: false, error: "Item name, total quantity, and unit are required" },
        { status: 400 },
      )
    }

    const result = await sql`
      INSERT INTO stationery_inventory (
        name, 
        description, 
        total_quantity, 
        available_quantity, 
        unit
      )
      VALUES (
        ${name}, 
        ${description || null}, 
        ${Number.parseInt(total_quantity)}, 
        ${Number.parseInt(total_quantity)}, 
        ${unit}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Stationery item added successfully",
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
    console.error("Error adding stationery item:", error)
    return NextResponse.json({ success: false, error: "Failed to add item" }, { status: 500 })
  }
}
