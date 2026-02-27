import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  // Only super admins can view and manage users
  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only super admins can manage users" }, { status: 403 })
  }

  try {
    const users = await sql`
      SELECT 
        a.id,
        a.username,
        a.role,
        a.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'course_id', c.id,
              'course_name', c.name
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as assigned_courses
      FROM admins a
      LEFT JOIN admin_course_assignments aca ON a.id = aca.admin_id
      LEFT JOIN courses c ON aca.course_id = c.id
      GROUP BY a.id, a.username, a.role, a.created_at
      ORDER BY a.created_at DESC
    `

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  // Only super admins can create users
  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only super admins can create users" }, { status: 403 })
  }

  try {
    const { username, password, role, assignedCourses } = await request.json()

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Username, password, and role are required" },
        { status: 400 },
      )
    }

    if (role !== "super_admin" && role !== "course_admin") {
      return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 })
    }

    if (role === "course_admin" && (!assignedCourses || assignedCourses.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Course admins must have at least one assigned course" },
        { status: 400 },
      )
    }

    // Check if username already exists
    const existing = await sql`
      SELECT id FROM admins WHERE username = ${username}
    `

    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Username already exists" }, { status: 409 })
    }

    // Create the user
    const result = await sql`
      INSERT INTO admins (username, password, role)
      VALUES (${username}, ${password}, ${role})
      RETURNING id, username, role
    `

    const newUser = result[0]

    // Assign courses if course admin
    if (role === "course_admin" && assignedCourses && assignedCourses.length > 0) {
      for (const courseId of assignedCourses) {
        await sql`
          INSERT INTO admin_course_assignments (admin_id, course_id)
          VALUES (${newUser.id}, ${courseId})
        `
      }
    }

    return NextResponse.json({ success: true, user: newUser })
  } catch (error) {
    console.error("Failed to create user:", error)
    return NextResponse.json({ success: false, message: "Failed to create user" }, { status: 500 })
  }
}
