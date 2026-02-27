import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    let authResult
    try {
      authResult = await validateAdminAuth(request)
    } catch (authError) {
      console.error("[MYT] Auth validation threw error:", authError)
      return createAdminUnauthorizedResponse()
    }

    if (!authResult.success || !authResult.admin) {
      return createAdminUnauthorizedResponse()
    }

    // Super admin only
    if (authResult.admin.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Super admin access required" }, { status: 403 })
    }

    let items
    try {
      items = await sql`
        SELECT 
          id, 
          name, 
          description, 
          total_quantity, 
          available_quantity, 
          unit,
          category,
          created_at,
          updated_at
        FROM stationery_inventory
        ORDER BY name ASC
      `
    } catch (dbError) {
      console.error("[MYT] Database query error:", dbError)
      return NextResponse.json(
        { success: false, error: "Database query failed", details: String(dbError) },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      items: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        total_quantity: item.total_quantity,
        available_quantity: item.available_quantity,
        unit: item.unit,
        category: item.category,
        is_low_stock: item.available_quantity < 10,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    })
  } catch (error) {
    console.error("[MYT] Unhandled error in GET /api/admin/stationery/items:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch items",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
