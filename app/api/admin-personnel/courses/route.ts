import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const courses = await sql`
      SELECT id, name, total_semesters FROM courses ORDER BY name ASC
    `

    return NextResponse.json({ success: true, courses })
  } catch (error) {
    console.error("Courses fetch error:", error)
    return NextResponse.json({ success: false, courses: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only super admins can create new courses" }, { status: 403 })
  }

  try {
    const { name, total_semesters } = await request.json()

    await sql`
      INSERT INTO courses (name, total_semesters)
      VALUES (${name}, ${total_semesters})
    `

    return NextResponse.json({ success: true, message: "Course added successfully" })
  } catch (error) {
    console.error("Course creation error:", error)
    return NextResponse.json({ success: false, message: "Failed to add course" }, { status: 500 })
  }
}
