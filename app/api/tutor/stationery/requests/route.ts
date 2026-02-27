import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateTutorAuth, createTutorUnauthorizedResponse } from "@/lib/tutor-auth"

// GET: Retrieve tutor's own stationery requests
export async function GET(request: NextRequest) {
  const authResult = await validateTutorAuth(request)
  if (!authResult.success || !authResult.tutor) {
    return createTutorUnauthorizedResponse()
  }

  try {
    const requests = await sql`
      SELECT 
        sr.id,
        sr.requester_name,
        sr.requester_type,
        sr.status,
        sr.created_at,
        sr.reason,
        sr.processed_by as processed_by_name,
        sr.processed_at,
        si.name,
        si.unit,
        sri.quantity
      FROM stationery_requests sr
      LEFT JOIN stationery_request_items sri ON sr.id = sri.request_id
      LEFT JOIN stationery_inventory si ON sri.item_id = si.id
      WHERE sr.requester_id = ${authResult.tutor.id} AND sr.requester_type = 'tutor'
      ORDER BY sr.created_at DESC
    `

    return NextResponse.json({
      success: true,
      requests: requests.map((req) => ({
        id: req.id,
        name: req.name,
        unit: req.unit,
        quantity: req.quantity,
        status: req.status,
        created_at: req.created_at,
        reason: req.reason,
        processed_by_name: req.processed_by_name,
        processed_at: req.processed_at,
      })),
    })
  } catch (error) {
    console.error("Error fetching tutor stationery requests:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch requests" }, { status: 500 })
  }
}

// POST: Submit new stationery request
export async function POST(request: NextRequest) {
  const authResult = await validateTutorAuth(request)
  if (!authResult.success || !authResult.tutor) {
    return createTutorUnauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { itemId, quantityRequested, purpose } = body

    if (!itemId || !quantityRequested) {
      return NextResponse.json({ success: false, error: "Item ID and quantity are required" }, { status: 400 })
    }

    if (Number.parseInt(quantityRequested) <= 0) {
      return NextResponse.json({ success: false, error: "Quantity must be greater than 0" }, { status: 400 })
    }

    const item = await sql`
      SELECT id, name, available_quantity
      FROM stationery_inventory
      WHERE id = ${Number.parseInt(itemId)} AND available_quantity > 0
    `

    if (item.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid item or item not available" }, { status: 404 })
    }

    const result = await sql`
      INSERT INTO stationery_requests (
        requester_id,
        requester_type,
        requester_name,
        reason,
        status
      )
      VALUES (
        ${authResult.tutor.id},
        'tutor',
        ${authResult.tutor.name},
        ${purpose || null},
        'pending_approval'
      )
      RETURNING *
    `

    const requestId = result[0].id

    // Add item to request items table
    await sql`
      INSERT INTO stationery_request_items (
        request_id,
        item_id,
        quantity
      )
      VALUES (
        ${requestId},
        ${Number.parseInt(itemId)},
        ${Number.parseInt(quantityRequested)}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Stationery request submitted successfully. Awaiting Course Admin approval.",
      request: {
        id: requestId,
        itemName: item[0].name,
        quantityRequested: quantityRequested,
        status: "pending_approval",
        requestDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error submitting tutor stationery request:", error)
    return NextResponse.json({ success: false, error: "Failed to submit request" }, { status: 500 })
  }
}
