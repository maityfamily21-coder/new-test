import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateTutorAuth } from "@/lib/tutor-auth"
import { verifyCourseAdminAuth } from "@/lib/course-admin-auth"
import { verifyTechnicalTeamAuth } from "@/lib/technical-team-auth"

async function getAuthenticatedUser(request: NextRequest) {
  // Simplified auth check (same as messages route)
  const tutorAuth = await validateTutorAuth(request)
  if (tutorAuth.success && tutorAuth.tutor) return { id: tutorAuth.tutor.id, type: "tutor" }

  const adminAuth = await verifyCourseAdminAuth(request)
  if (adminAuth.success && adminAuth.admin) return { id: adminAuth.admin.id, type: "admin_personnel" }

  const techAuth = await verifyTechnicalTeamAuth(request)
  if (techAuth.success && techAuth.technical) return { id: techAuth.technical.id, type: "technical" }

  return null
}

export async function GET(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const ticketId = Number.parseInt(params.ticketId)

  try {
    const attachments = await sql`
      SELECT id, uploaded_by_type, file_name, file_url, file_type, created_at
      FROM ticket_attachments
      WHERE ticket_id = ${ticketId}
      ORDER BY created_at ASC
    `
    return NextResponse.json({ success: true, attachments })
  } catch (error) {
    console.error("[MYT] Error fetching ticket attachments:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch attachments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })

  const ticketId = Number.parseInt(params.ticketId)

  try {
    const { fileName, fileUrl, fileType } = await request.json()

    const result = await sql`
      INSERT INTO ticket_attachments (ticket_id, uploaded_by_id, uploaded_by_type, file_name, file_url, file_type)
      VALUES (${ticketId}, ${user.id}, ${user.type}, ${fileName}, ${fileUrl}, ${fileType})
      RETURNING *
    `

    return NextResponse.json({ success: true, attachment: result[0] })
  } catch (error) {
    console.error("[MYT] Error saving attachment:", error)
    return NextResponse.json({ success: false, message: "Failed to save attachment" }, { status: 500 })
  }
}
