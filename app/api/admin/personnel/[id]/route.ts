import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

// PUT - Update administrative personnel
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { name, email, username, is_active } = await request.json()
    const id = Number.parseInt(params.id)

    const result = await sql`
      UPDATE administrative_personnel
      SET 
        name = ${name || null} ?? name,
        email = ${email || null} ?? email,
        username = ${username || null} ?? username,
        is_active = ${is_active !== undefined ? is_active : null} ?? is_active,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name, email, username, is_active, updated_at
    `

    if (result.length === 0) {
      return Response.json({ error: "Personnel not found" }, { status: 404 })
    }

    return Response.json({ success: true, data: result[0] })
  } catch (error) {
    console.error("Error updating personnel:", error)
    return Response.json({ error: "Failed to update personnel" }, { status: 500 })
  }
}

// DELETE - Remove administrative personnel
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const id = Number.parseInt(params.id)

    const result = await sql`
      DELETE FROM administrative_personnel WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return Response.json({ error: "Personnel not found" }, { status: 404 })
    }

    return Response.json({ success: true, message: "Personnel deleted successfully" })
  } catch (error) {
    console.error("Error deleting personnel:", error)
    return Response.json({ error: "Failed to delete personnel" }, { status: 500 })
  }
}
