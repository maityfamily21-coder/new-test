import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyTechnicalTeamAuth } from "@/lib/technical-team-auth"

// POST - Close a claimed ticket with resolution notes
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
    const { resolutionNotes } = await request.json()

    if (!resolutionNotes) {
      return NextResponse.json({ success: false, message: "Resolution notes are required" }, { status: 400 })
    }

    // Check if ticket exists and is claimed by this user
    const ticketCheck = await sql`
      SELECT id, status, claimed_by_id, title
      FROM support_tickets
      WHERE id = ${ticketId}
    `

    if (ticketCheck.length === 0) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }

    const ticket = ticketCheck[0]

    if (ticket.status === "closed") {
      return NextResponse.json({ success: false, message: "Ticket is already closed" }, { status: 400 })
    }

    if (ticket.status === "open") {
      return NextResponse.json({ success: false, message: "Ticket must be claimed before closing" }, { status: 400 })
    }

    if (ticket.claimed_by_id !== authResult.technical.id) {
      return NextResponse.json(
        { success: false, message: "You can only close tickets claimed by you" },
        { status: 403 },
      )
    }

    // Close the ticket
    const result = await sql`
      UPDATE support_tickets
      SET 
        status = 'closed',
        closed_at = NOW(),
        resolution_notes = ${resolutionNotes},
        updated_at = NOW()
      WHERE id = ${ticketId}
      RETURNING id, title, status, resolution_notes, closed_at
    `

    return NextResponse.json({
      success: true,
      message: "Ticket closed successfully",
      ticket: result[0],
    })
  } catch (error) {
    console.error("[MYT] Error closing ticket:", error)
    return NextResponse.json({ success: false, message: "Failed to close ticket" }, { status: 500 })
  }
}
