import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

// GET all technical team users
export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  // Only super admins can manage technical team
  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Only super admins can manage technical team" },
      { status: 403 },
    )
  }

  try {
    const users = await sql`
      SELECT id, username, name, email, created_at
      FROM technical_team_users
      ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error("Failed to fetch technical team users:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch users" }, { status: 500 })
  }
}

// POST create new technical team user
export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Only super admins can create technical team users" },
      { status: 403 },
    )
  }

  try {
    const { username, password, name, email } = await request.json()

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, message: "Username, password, and name are required" },
        { status: 400 },
      )
    }

    // Check if username exists
    const existing = await sql`
      SELECT id FROM technical_team_users WHERE username = ${username}
    `

    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Username already exists" }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO technical_team_users (username, password, name, email)
      VALUES (${username}, ${password}, ${name}, ${email || null})
      RETURNING id, username, name, email, created_at
    `

    return NextResponse.json({ success: true, user: result[0] })
  } catch (error) {
    console.error("Failed to create technical team user:", error)
    return NextResponse.json({ success: false, message: "Failed to create user" }, { status: 500 })
  }
}
