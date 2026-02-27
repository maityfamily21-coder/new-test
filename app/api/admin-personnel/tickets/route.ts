import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyCourseAdminAuth } from "@/lib/course-admin-auth"

// POST - Raise a new support ticket
export async function POST(request: NextRequest) {
  const authResult = await verifyCourseAdminAuth(request)

  if (!authResult.success || !authResult.admin) {
    return NextResponse.json({ success: false, message: "Admin Personnel access required" }, { status: 401 })
  }

  try {
    const { title, description, priority = "medium" } = await request.json()

    if (!title || !description) {
      return NextResponse.json({ success: false, message: "Title and description are required" }, { status: 400 })
    }

    const userName = authResult.admin.name || authResult.admin.username

    const result = await sql`
      INSERT INTO support_tickets (
        title,
        description,
        priority,
        created_by_id,
        created_by_type,
        created_by_name,
        status
      ) VALUES (
        ${title},
        ${description},
        ${priority},
        ${authResult.admin.id},
        'admin_personnel',
        ${userName},
        'open'
      )
      RETURNING id, title, description, priority, status, created_at
    `

    return NextResponse.json({
      success: true,
      message: "Support ticket created successfully",
      ticket: result[0],
    })
  } catch (error) {
    console.error("[MYT] Error creating support ticket:", error)
    return NextResponse.json({ success: false, message: "Failed to create support ticket" }, { status: 500 })
  }
}

// GET - Retrieve all tickets raised by the admin personnel
export async function GET(request: NextRequest) {
  const authResult = await verifyCourseAdminAuth(request)

  if (!authResult.success || !authResult.admin) {
    return NextResponse.json({ success: false, message: "Admin Personnel access required" }, { status: 401 })
  }

  try {
    const tickets = await sql`
      SELECT 
        id,
        title,
        description,
        priority,
        status,
        created_by_name,
        claimed_by_name,
        claimed_at,
        closed_at,
        resolution_notes,
        created_at,
        updated_at
      FROM support_tickets
      WHERE created_by_id = ${authResult.admin.id}
        AND created_by_type = 'admin_personnel'
      ORDER BY 
        CASE status
          WHEN 'open' THEN 1
          WHEN 'claimed' THEN 2
          WHEN 'closed' THEN 3
        END,
        created_at DESC
    `

    return NextResponse.json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error("[MYT] Error fetching tickets:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch tickets" }, { status: 500 })
  }
}
