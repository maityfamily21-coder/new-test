import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyTechnicalTeamAuth } from "@/lib/technical-team-auth"

// POST - Claim a ticket (first-come basis)
export async function POST(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const authResult = await verifyTechnicalTeamAuth(request)

  if (!authResult.success || !authResult.technical) {
    return NextResponse.json({ success: false, message: "Technical Team access required" }, { status: 401 })
  }

  const ticketId = Number.parseInt(params.ticketId)

  if (isNaN(ticketId)) {
    return NextResponse.json({ success: false, message: "Invalid ticket ID" }, { status: 400 })
  }

  try {
    // Check if ticket exists and is still open
    const ticketCheck = await sql`
      SELECT id, status, title
      FROM support_tickets
      WHERE id = ${ticketId}
    `

    if (ticketCheck.length === 0) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }

    if (ticketCheck[0].status !== "open") {
      return NextResponse.json(
        { success: false, message: `Ticket is already ${ticketCheck[0].status}` },
        { status: 400 },
      )
    }

    // Claim the ticket (first-come basis)
    const userName = authResult.technical.name || authResult.technical.username

    const result = await sql`
      UPDATE support_tickets
      SET 
        status = 'claimed',
        claimed_by_id = ${authResult.technical.id},
        claimed_by_name = ${userName},
        claimed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${ticketId}
        AND status = 'open'
      RETURNING id, title, status, claimed_by_name, claimed_at
    `

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "Ticket was just claimed by another team member" },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Ticket claimed successfully",
      ticket: result[0],
    })
  } catch (error) {
    console.error("[MYT] Error claiming ticket:", error)
    return NextResponse.json({ success: false, message: "Failed to claim ticket" }, { status: 500 })
  }
}
