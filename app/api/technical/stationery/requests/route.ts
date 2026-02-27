import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateTechnicalAuth, createTechnicalUnauthorizedResponse } from "@/lib/technical-auth"

// GET: Retrieve all stationery requests (for technical team review)
export async function GET(request: NextRequest) {
  const authResult = await validateTechnicalAuth(request)
  if (!authResult.success || !authResult.user) {
    return createTechnicalUnauthorizedResponse()
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"

    let requests
    if (status === "all") {
      requests = await sql`
        SELECT 
          sr.id,
          sr.requester_id,
          sr.requester_type,
          sr.requester_name,
          sr.status,
          sr.created_at,
          sr.reason as purpose,
          sr.reviewed_by_technical_id,
          sr.reviewed_by_technical_at,
          sr.admin_notes as rejection_reason,
          sr.reviewed_by_course_admin_id,
          COALESCE(ap.name, adm.username) as forwarded_by_name,
          si.name,
          si.unit,
          si.available_quantity,
          sri.quantity
        FROM stationery_requests sr
        JOIN stationery_request_items sri ON sri.request_id = sr.id
        JOIN stationery_inventory si ON sri.item_id = si.id
        LEFT JOIN administrative_personnel ap ON sr.reviewed_by_course_admin_id = ap.id
        LEFT JOIN admins adm ON sr.reviewed_by_course_admin_id = adm.id
        ORDER BY 
          CASE sr.status 
            WHEN 'pending' THEN 1 
            WHEN 'forwarded' THEN 1
            WHEN 'approved' THEN 2 
            WHEN 'rejected' THEN 3 
          END,
          sr.created_at DESC
      `
    } else {
      requests = await sql`
        SELECT 
          sr.id,
          sr.requester_id,
          sr.requester_type,
          sr.requester_name,
          sr.status,
          sr.created_at,
          sr.reason as purpose,
          sr.reviewed_by_technical_id,
          sr.reviewed_by_technical_at,
          sr.admin_notes as rejection_reason,
          sr.reviewed_by_course_admin_id,
          COALESCE(ap.name, adm.username) as forwarded_by_name,
          si.name,
          si.unit,
          si.available_quantity,
          sri.quantity
        FROM stationery_requests sr
        JOIN stationery_request_items sri ON sri.request_id = sr.id
        JOIN stationery_inventory si ON sri.item_id = si.id
        LEFT JOIN administrative_personnel ap ON sr.reviewed_by_course_admin_id = ap.id
        LEFT JOIN admins adm ON sr.reviewed_by_course_admin_id = adm.id
        WHERE sr.status = ${status}
        ORDER BY sr.created_at DESC
      `
    }

    console.log("[v0] Stationery requests fetched:", requests.length, "requests")
    requests.forEach((req, idx) => {
      console.log(`[v0] Request ${idx}:`, {
        id: req.id,
        status: req.status,
        reviewed_by_course_admin_id: req.reviewed_by_course_admin_id,
        forwarded_by_name: req.forwarded_by_name,
        requester_type: req.requester_type,
      })
    })

    const responseData = requests.map((req) => ({
      id: req.id,
      requester_name: req.requester_name,
      requester_type: req.requester_type,
      name: req.name,
      unit: req.unit,
      quantity: req.quantity,
      available_quantity: req.available_quantity,
      status: req.status,
      created_at: req.created_at,
      purpose: req.purpose,
      reviewed_by_technical_id: req.reviewed_by_technical_id,
      reviewed_by_technical_at: req.reviewed_by_technical_at,
      rejection_reason: req.rejection_reason,
      forwarded_by_name: req.forwarded_by_name,
    }))

    console.log("[v0] Response to be sent:", JSON.stringify(responseData.slice(0, 2), null, 2))

    return NextResponse.json({
      success: true,
      requests: responseData,
    })
  } catch (error) {
    console.error("Error fetching stationery requests:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch requests" }, { status: 500 })
  }
}
