import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

// PUT update technical team user
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Only super admins can update technical team users" },
      { status: 403 },
    )
  }

  try {
    const { username, password, name, email } = await request.json()
    const userId = Number(params.id)

    if (!username || !name) {
      return NextResponse.json({ success: false, message: "Username and name are required" }, { status: 400 })
    }

    // Check if username exists for other users
    const existing = await sql`
      SELECT id FROM technical_team_users WHERE username = ${username} AND id != ${userId}
    `

    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Username already exists" }, { status: 409 })
    }

    // Update with or without password
    const result = password
      ? await sql`
          UPDATE technical_team_users
          SET username = ${username}, password = ${password}, name = ${name}, email = ${email || null}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userId}
          RETURNING id, username, name, email, updated_at
        `
      : await sql`
          UPDATE technical_team_users
          SET username = ${username}, name = ${name}, email = ${email || null}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userId}
          RETURNING id, username, name, email, updated_at
        `

    if (result.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: result[0] })
  } catch (error) {
    console.error("Failed to update technical team user:", error)
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 })
  }
}

// DELETE technical team user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Only super admins can delete technical team users" },
      { status: 403 },
    )
  }

  try {
    const userId = Number(params.id)

    const result = await sql`
      DELETE FROM technical_team_users
      WHERE id = ${userId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Failed to delete technical team user:", error)
    return NextResponse.json({ success: false, message: "Failed to delete user" }, { status: 500 })
  }
}
