import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const courseAdmins = await sql`
      SELECT 
        ap.id,
        ap.name,
        ap.email,
        ap.username,
        ap.role,
        ap.assigned_course_ids,
        ap.is_active,
        ap.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', c.id, 'name', c.name) ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as assigned_courses
      FROM administrative_personnel ap
      LEFT JOIN courses c ON c.id = ANY(ap.assigned_course_ids)
      WHERE ap.role IN ('course_admin', 'super_admin')
      GROUP BY ap.id
      ORDER BY ap.created_at DESC
    `

    return NextResponse.json({ success: true, courseAdmins })
  } catch (error) {
    console.error("Error fetching course admins:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch course admins" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { name, email, username, password, role, assigned_course_ids } = await request.json()

    if (!name || !email || !username || !password || !role) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    if (!["super_admin", "course_admin", "personnel"].includes(role)) {
      return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 })
    }

    // Validate assigned courses for course_admin role
    if (role === "course_admin") {
      if (!assigned_course_ids || !Array.isArray(assigned_course_ids) || assigned_course_ids.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Course admins must have at least one assigned course",
          },
          { status: 400 },
        )
      }

      // Verify courses exist
      const courseCheck = await sql`
        SELECT COUNT(*) as count FROM courses WHERE id = ANY(${assigned_course_ids})
      `
      if (courseCheck[0].count !== assigned_course_ids.length) {
        return NextResponse.json({ success: false, message: "One or more invalid course IDs" }, { status: 400 })
      }
    }

    const courseIdsArray = role === "course_admin" && assigned_course_ids ? assigned_course_ids : []

    const result = await sql`
      INSERT INTO administrative_personnel (name, email, username, password, role, assigned_course_ids, is_active)
      VALUES (${name}, ${email}, ${username}, ${password}, ${role}, ${courseIdsArray}, true)
      RETURNING id, name, email, username, role, assigned_course_ids
    `

    return NextResponse.json({
      success: true,
      message: "Course admin created successfully",
      courseAdmin: result[0],
    })
  } catch (error: any) {
    console.error("Error creating course admin:", error)
    if (error.message?.includes("duplicate key")) {
      return NextResponse.json({ success: false, message: "Username or email already exists" }, { status: 400 })
    }
    return NextResponse.json({ success: false, message: "Failed to create course admin" }, { status: 500 })
  }
}
