import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { jwtVerify } from "jose"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

async function verifyToken(token: string) {
  try {
    const tokenWithoutBearer = token.startsWith("Bearer ") ? token.slice(7) : token
    const verified = await jwtVerify(tokenWithoutBearer, SECRET_KEY)
    return verified.payload as any
  } catch (error) {
    return null
  }
}

// GET: Retrieve accounts personnel's own stationery requests
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const payload = await verifyToken(authHeader)
  if (!payload || payload.role !== "accounts_personnel") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const requests = await sql`
      SELECT 
        sr.id,
        sr.requester_name,
        sr.requester_type,
        sr.status,
        sr.created_at as request_date,
        sr.reason as purpose,
        sr.processed_by,
        sr.processed_at as reviewed_at,
        sr.admin_notes as rejection_reason,
        si.name as item_name,
        si.unit,
        sri.quantity as quantity_requested
      FROM stationery_requests sr
      LEFT JOIN stationery_request_items sri ON sr.id = sri.request_id
      LEFT JOIN stationery_inventory si ON sri.item_id = si.id
      WHERE sr.requester_id = ${payload.id} AND sr.requester_type = 'accounts_personnel'
      ORDER BY sr.created_at DESC
    `

    return NextResponse.json({
      success: true,
      requests: requests.map((req) => ({
        id: req.id,
        itemName: req.item_name,
        unit: req.unit,
        quantityRequested: req.quantity_requested,
        status: req.status,
        requestDate: req.request_date,
        purpose: req.purpose,
        reviewedByName: req.processed_by,
        reviewedAt: req.reviewed_at,
        rejectionReason: req.rejection_reason,
      })),
    })
  } catch (error) {
    console.error("Error fetching accounts personnel stationery requests:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch requests" }, { status: 500 })
  }
}

// POST: Submit new stationery request
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const payload = await verifyToken(authHeader)
  if (!payload || payload.role !== "accounts_personnel") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { itemId, quantityRequested, purpose } = body

    console.log("[MYT] Accounts personnel stationery request - User:", payload)
    console.log("[MYT] Request body:", { itemId, quantityRequested, purpose })

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

    const requesterName = payload.name || payload.username || "Unknown"

    console.log("[MYT] Inserting request - requester_name:", requesterName)

    const result = await sql`
      INSERT INTO stationery_requests (
        requester_id,
        requester_type,
        requester_name,
        reason,
        status
      )
      VALUES (
        ${payload.id},
        'accounts_personnel',
        ${requesterName},
        ${purpose || null},
        'pending'
      )
      RETURNING *
    `

    const requestId = result[0].id
    console.log("[MYT] Request created with ID:", requestId)

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

    console.log("[MYT] Request item added successfully")

    return NextResponse.json({
      success: true,
      message: "Stationery request submitted successfully",
      request: {
        id: requestId,
        itemName: item[0].name,
        quantityRequested: quantityRequested,
        status: "pending",
        requestDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[MYT] Error submitting accounts personnel stationery request:", error)
    return NextResponse.json({ success: false, error: "Failed to submit request" }, { status: 500 })
  }
}
