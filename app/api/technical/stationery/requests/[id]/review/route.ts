import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateTechnicalAuth, createTechnicalUnauthorizedResponse } from "@/lib/technical-auth"

// PUT: Approve or reject a stationery request
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateTechnicalAuth(request)
  if (!authResult.success || !authResult.user) {
    return createTechnicalUnauthorizedResponse()
  }

  try {
    const requestId = Number.parseInt(params.id)
    const body = await request.json()
    const { action, reason } = body

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 },
      )
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required when rejecting a request" },
        { status: 400 },
      )
    }

    // Get request details with items through the stationery_request_items junction table
    const requestDetails = await sql`
      SELECT 
        sr.id,
        sr.status,
        sr.requester_id,
        sr.requester_name,
        sr.requester_type,
        si.id as item_id,
        si.name as item_name,
        sri.quantity as quantity_requested,
        si.available_quantity,
        sr.reason,
        sr.created_at
      FROM stationery_requests sr
      JOIN stationery_request_items sri ON sri.request_id = sr.id
      JOIN stationery_inventory si ON sri.item_id = si.id
      WHERE sr.id = ${requestId} AND (sr.status = 'pending' OR sr.status = 'forwarded')
    `

    if (requestDetails.length === 0) {
      return NextResponse.json({ success: false, error: "Request not found or already reviewed" }, { status: 404 })
    }

    const req = requestDetails[0]

    // Check if sufficient stock is available for approval
    if (action === "approve" && req.quantity_requested > req.available_quantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock. Requested: ${req.quantity_requested}, Available: ${req.available_quantity}`,
        },
        { status: 400 },
      )
    }

    // Update the request status
    const newStatus = action === "approve" ? "approved" : "rejected"
    const result = await sql`
      UPDATE stationery_requests
      SET 
        status = ${newStatus},
        reviewed_by_technical_id = ${authResult.user.id},
        reviewed_by_technical_at = NOW(),
        admin_notes = ${action === "reject" ? reason : null}
      WHERE id = ${requestId} AND (status = 'pending' OR status = 'forwarded')
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Failed to update request" }, { status: 500 })
    }

    if (action === "approve") {
      await sql`
        UPDATE stationery_inventory
        SET available_quantity = available_quantity - ${req.quantity_requested}
        WHERE id = ${req.item_id}
      `
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action === "approve" ? "approved" : "rejected"} successfully`,
      request: {
        id: result[0].id,
        status: result[0].status,
        reviewedBy: result[0].reviewed_by_technical_id,
        reviewedAt: result[0].reviewed_by_technical_at,
      },
    })
  } catch (error) {
    console.error("Error reviewing stationery request:", error)
    return NextResponse.json({ success: false, error: "Failed to review request" }, { status: 500 })
  }
}
