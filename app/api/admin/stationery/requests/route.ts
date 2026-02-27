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

    let requests
    try {
      requests = await sql`
        SELECT 
          sr.id,
          sr.requester_id,
          sr.requester_type,
          sr.requester_name,
          sr.status,
          sr.created_at,
          sr.reason,
          sr.processed_by,
          sr.processed_at,
          sr.admin_notes,
          sri.quantity,
          si.name as item_name,
          si.unit,
          si.available_quantity
        FROM stationery_requests sr
        LEFT JOIN stationery_request_items sri ON sr.id = sri.request_id
        LEFT JOIN stationery_inventory si ON sri.item_id = si.id
        ORDER BY sr.created_at DESC
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
      count: requests.length,
      requests: requests.map((req: any) => ({
        id: req.id,
        requester_id: req.requester_id,
        requester_type: req.requester_type,
        requester_name: req.requester_name,
        item_name: req.item_name,
        unit: req.unit,
        quantity: req.quantity,
        available_quantity: req.available_quantity,
        status: req.status,
        created_at: req.created_at,
        reason: req.reason,
        processed_by: req.processed_by,
        processed_at: req.processed_at,
        admin_notes: req.admin_notes,
      })),
    })
  } catch (error) {
    console.error("[MYT] Unhandled error in GET /api/admin/stationery/requests:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch requests",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
