import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only super admins can update users" }, { status: 403 })
  }

  try {
    const userId = Number.parseInt(params.id)
    const { username, password, role, assignedCourses } = await request.json()

    if (!username || !role) {
      return NextResponse.json({ success: false, message: "Username and role are required" }, { status: 400 })
    }

    // Update basic user info
    if (password) {
      await sql`
        UPDATE admins
        SET username = ${username}, password = ${password}, role = ${role}
        WHERE id = ${userId}
      `
    } else {
      await sql`
        UPDATE admins
        SET username = ${username}, role = ${role}
        WHERE id = ${userId}
      `
    }

    // Update course assignments for course admins
    await sql`DELETE FROM admin_course_assignments WHERE admin_id = ${userId}`

    if (role === "course_admin" && assignedCourses && assignedCourses.length > 0) {
      for (const courseId of assignedCourses) {
        await sql`
          INSERT INTO admin_course_assignments (admin_id, course_id)
          VALUES (${userId}, ${courseId})
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update user:", error)
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse()
  }

  if (authResult.admin.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Only super admins can delete users" }, { status: 403 })
  }

  try {
    const userId = Number.parseInt(params.id)

    await sql`DELETE FROM admins WHERE id = ${userId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete user:", error)
    return NextResponse.json({ success: false, message: "Failed to delete user" }, { status: 500 })
  }
}
