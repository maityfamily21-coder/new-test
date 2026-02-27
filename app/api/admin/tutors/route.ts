import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

async function validateAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { success: false, error: "Missing or invalid authorization header" }
  }

  try {
    // Extract credentials from Bearer token (format: base64 "username:password")
    const token = authHeader.substring(7)
    const credentials = Buffer.from(token, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    if (!username || !password) {
      return { success: false, error: "Invalid credentials format" }
    }

    // Verify admin credentials in database
    const result = await sql`
      SELECT id, username, role FROM admins WHERE username = ${username} AND password = ${password}
    `

    if (result.length === 0) {
      return { success: false, error: "Invalid admin credentials" }
    }

    return { success: true, admin: result[0] }
  } catch (error) {
    console.error("Admin auth error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return Response.json({ success: false, error: authResult.error || "Unauthorized" }, { status: 401 })
  }

  try {
    const tutors = await sql`
      SELECT 
        t.id,
        t.name,
        t.username,
        t.department,
        t.faculty_type,
        COUNT(DISTINCT ts.subject_id) as subject_count
      FROM tutors t
      LEFT JOIN tutor_subjects ts ON t.id = ts.tutor_id
      GROUP BY t.id, t.name, t.username, t.department, t.faculty_type
      ORDER BY t.name
    `
    return Response.json({ success: true, tutors })
  } catch (error) {
    console.error("Error fetching tutors:", error)
    return Response.json({ success: false, error: "Failed to fetch tutors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return Response.json({ success: false, error: authResult.error || "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, username, department, faculty_type, password } = await request.json()

    if (!name || !username || !department || !password) {
      return Response.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO tutors (name, username, department, faculty_type, password)
      VALUES (${name}, ${username}, ${department}, ${faculty_type || "Inhouse"}, ${password})
      RETURNING id, name, username, department, faculty_type
    `

    return Response.json({ success: true, tutor: result[0] })
  } catch (error) {
    console.error("Error creating tutor:", error)
    return Response.json({ success: false, error: "Failed to create tutor" }, { status: 500 })
  }
}
