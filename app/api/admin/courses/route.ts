import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyAdminToken, validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const admin = await verifyAdminToken(token)
    if (!admin) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 })
    }

    let courses
    if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
      courses = await sql`
        SELECT id, name, total_semesters FROM courses 
        WHERE id = ANY(${admin.assignedCourses})
        ORDER BY name ASC
      `
    } else {
      courses = await sql`
        SELECT id, name, total_semesters FROM courses ORDER BY name ASC
      `
    }

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
