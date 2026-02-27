import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const id = Number.parseInt(params.id)
    const { name, email, role, assigned_course_ids, is_active } = await request.json()

    // Validate role
    if (role && !["super_admin", "course_admin", "personnel"].includes(role)) {
      return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 })
    }

    // Validate assigned courses for course_admin role
    if (role === "course_admin" && assigned_course_ids) {
      if (!Array.isArray(assigned_course_ids) || assigned_course_ids.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Course admins must have at least one assigned course",
          },
          { status: 400 },
        )
      }

      const courseCheck = await sql`
        SELECT COUNT(*) as count FROM courses WHERE id = ANY(${assigned_course_ids})
      `
      if (courseCheck[0].count !== assigned_course_ids.length) {
        return NextResponse.json({ success: false, message: "One or more invalid course IDs" }, { status: 400 })
      }
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(name)
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`)
      values.push(email)
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`)
      values.push(role)
    }
    if (assigned_course_ids !== undefined) {
      updates.push(`assigned_course_ids = $${paramCount++}`)
      values.push(assigned_course_ids)
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(is_active)
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE administrative_personnel 
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, email, username, role, assigned_course_ids, is_active
    `

    const result = await sql.query(query, values)

    if (result.length === 0) {
      return NextResponse.json({ success: false, message: "Course admin not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Course admin updated successfully",
      courseAdmin: result[0],
    })
  } catch (error: any) {
    console.error("Error updating course admin:", error)
    if (error.message?.includes("duplicate key")) {
      return NextResponse.json({ success: false, message: "Email already exists" }, { status: 400 })
    }
    return NextResponse.json({ success: false, message: "Failed to update course admin" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const id = Number.parseInt(params.id)

    const result = await sql`
      DELETE FROM administrative_personnel 
      WHERE id = ${id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, message: "Course admin not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Course admin deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting course admin:", error)
    return NextResponse.json({ success: false, message: "Failed to delete course admin" }, { status: 500 })
  }
}
