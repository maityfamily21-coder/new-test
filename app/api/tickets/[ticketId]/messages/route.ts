import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateTutorAuth } from "@/lib/tutor-auth"
import { verifyCourseAdminAuth } from "@/lib/course-admin-auth"
import { verifyTechnicalTeamAuth } from "@/lib/technical-team-auth"

async function getAuthenticatedUser(request: NextRequest) {
  // Try Tutor
  const tutorAuth = await validateTutorAuth(request)
  if (tutorAuth.success && tutorAuth.tutor) {
    return { id: tutorAuth.tutor.id, type: "tutor", name: tutorAuth.tutor.name }
  }

  // Try Admin Personnel
  const adminAuth = await verifyCourseAdminAuth(request)
  if (adminAuth.success && adminAuth.admin) {
    return { id: adminAuth.admin.id, type: "admin_personnel", name: adminAuth.admin.name || adminAuth.admin.username }
  }

  // Try Technical Team
  const techAuth = await verifyTechnicalTeamAuth(request)
  if (techAuth.success && techAuth.technical) {
    return {
      id: techAuth.technical.id,
      type: "technical",
      name: techAuth.technical.name || techAuth.technical.username,
    }
  }

  return null
}

export async function GET(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const ticketId = Number.parseInt(params.ticketId)

  try {
    const messages = await sql`
      SELECT id, sender_id, sender_type, sender_name, content, message_type, created_at
      FROM ticket_messages
      WHERE ticket_id = ${ticketId}
      ORDER BY created_at ASC
    `

    return NextResponse.json({ success: true, messages })
  } catch (error) {
    console.error("[MYT] Error fetching ticket messages:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const ticketId = Number.parseInt(params.ticketId)

  try {
    const { content } = await request.json()
    if (!content) return NextResponse.json({ success: false, message: "Content is required" }, { status: 400 })

    const result = await sql`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_type, sender_name, content)
      VALUES (${ticketId}, ${user.id}, ${user.type}, ${user.name}, ${content})
      RETURNING *
    `

    return NextResponse.json({ success: true, message: result[0] })
  } catch (error) {
    console.error("[MYT] Error sending ticket message:", error)
    return NextResponse.json({ success: false, message: "Failed to send message" }, { status: 500 })
  }
}
