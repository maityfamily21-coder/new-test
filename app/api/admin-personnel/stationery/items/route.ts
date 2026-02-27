import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateCourseAdminAuth, createCourseAdminUnauthorizedResponse } from "@/lib/course-admin-auth"

// GET: Retrieve available stationery items for admin personnel
export async function GET(request: NextRequest) {
  const authResult = await validateCourseAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createCourseAdminUnauthorizedResponse()
  }

  try {
    const items = await sql`
      SELECT 
        id, 
        name, 
        description, 
        available_quantity, 
        unit
      FROM stationery_inventory
      WHERE available_quantity > 0
      ORDER BY name ASC
    `

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        available_quantity: item.available_quantity,
        unit: item.unit,
      })),
    })
  } catch (error) {
    console.error("Error fetching stationery items for admin personnel:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch items" }, { status: 500 })
  }
}
