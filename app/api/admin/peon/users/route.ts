import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const users = await sql`
      SELECT id, name, email, username, phone_number, is_active, created_at
      FROM peon_housekeeping_users
      ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error("Failed to fetch peon users:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, username, password, phone_number } = await request.json()

    if (!name || !email || !username || !password) {
      return NextResponse.json({ success: false, message: "All required fields must be provided" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO peon_housekeeping_users (name, email, username, password, phone_number)
      VALUES (${name}, ${email}, ${username}, ${password}, ${phone_number || null})
      RETURNING id, name, email, username
    `

    return NextResponse.json({ success: true, user: result[0] })
  } catch (error: any) {
    console.error("Failed to create peon user:", error)
    if (error.code === "23505") {
      return NextResponse.json({ success: false, message: "Username or email already exists" }, { status: 400 })
    }
    return NextResponse.json({ success: false, message: "Failed to create user" }, { status: 500 })
  }
}
