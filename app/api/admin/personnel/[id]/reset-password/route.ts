import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { newPassword } = await request.json()
    const id = Number.parseInt(params.id)

    if (!newPassword) {
      return Response.json({ error: "New password is required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE administrative_personnel
      SET password = ${newPassword}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name, email, username
    `

    if (result.length === 0) {
      return Response.json({ error: "Personnel not found" }, { status: 404 })
    }

    return Response.json({ success: true, message: "Password reset successfully" })
  } catch (error) {
    console.error("Error resetting password:", error)
    return Response.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
