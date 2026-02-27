import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyTechnicalTeamAuth } from "@/lib/technical-team-auth"

// GET - Retrieve all support tickets for Technical Team dashboard
export async function GET(request: NextRequest) {
  const authResult = await verifyTechnicalTeamAuth(request)

  if (!authResult.success || !authResult.technical) {
    return NextResponse.json({ success: false, message: "Technical Team access required" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status") // open, claimed, closed, or all

    let tickets

    if (statusFilter && statusFilter !== "all") {
      tickets = await sql`
        SELECT 
          id,
          title,
          description,
          priority,
          status,
          created_by_id,
          created_by_type,
          created_by_name,
          claimed_by_id,
          claimed_by_name,
          claimed_at,
          closed_at,
          resolution_notes,
          created_at,
          updated_at
        FROM support_tickets
        WHERE status = ${statusFilter}
        ORDER BY 
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          created_at DESC
      `
    } else {
      tickets = await sql`
        SELECT 
          id,
          title,
          description,
          priority,
          status,
          created_by_id,
          created_by_type,
          created_by_name,
          claimed_by_id,
          claimed_by_name,
          claimed_at,
          closed_at,
          resolution_notes,
          created_at,
          updated_at
        FROM support_tickets
        ORDER BY 
          CASE status
            WHEN 'open' THEN 1
            WHEN 'claimed' THEN 2
            WHEN 'closed' THEN 3
          END,
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          created_at DESC
      `
    }

    return NextResponse.json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error("[MYT] Error fetching tickets:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch tickets" }, { status: 500 })
  }
}
