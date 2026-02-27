import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

// GET all administrative personnel
export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const personnel = await sql`
      SELECT id, name, email, username, is_active, created_at, updated_at
      FROM administrative_personnel
      ORDER BY created_at DESC
    `
    return Response.json(personnel)
  } catch (error) {
    console.error("Error fetching personnel:", error)
    return Response.json({ error: "Failed to fetch personnel" }, { status: 500 })
  }
}

// POST - Add new administrative personnel
export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { name, email, username, password } = await request.json()

    if (!name || !email || !username || !password) {
      return Response.json({ error: "All fields are required" }, { status: 400 })
    }

    // Check if username or email already exists
    const existing = await sql`
      SELECT id FROM administrative_personnel 
      WHERE username = ${username} OR email = ${email}
    `

    if (existing.length > 0) {
      return Response.json({ error: "Username or email already exists" }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO administrative_personnel (name, email, username, password)
      VALUES (${name}, ${email}, ${username}, ${password})
      RETURNING id, name, email, username, is_active, created_at
    `

    return Response.json({ success: true, data: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating personnel:", error)
    return Response.json({ error: "Failed to create personnel" }, { status: 500 })
  }
}
