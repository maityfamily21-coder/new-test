import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"

export interface AuthenticatedAdmin {
  id: number
  username: string
  role: "super_admin" | "course_admin"
  assignedCourses?: number[] // Only for course admins
}

export async function validateAdminAuth(request: NextRequest): Promise<{
  success: boolean
  admin?: AuthenticatedAdmin
  error?: string
}> {
  try {
    console.log("[MYT] Admin auth validation started")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("[MYT] Auth header:", authHeader ? "Present" : "Missing")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[MYT] Invalid auth header format")
      return { success: false, error: "Missing or invalid authorization header" }
    }

    // Extract credentials from Bearer token (format: "username:password")
    const token = authHeader.substring(7) // Remove "Bearer "
    const credentials = Buffer.from(token, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    console.log("[MYT] Extracted username:", username)

    if (!username || !password) {
      console.log("[MYT] Invalid credentials format")
      return { success: false, error: "Invalid credentials format" }
    }

    // Authenticate admin
    console.log("[MYT] Querying database for admin")
    const result = await sql`
      SELECT id, username, role FROM admins WHERE username = ${username} AND password = ${password}
    `

    console.log("[MYT] Database query result count:", result.length)

    if (result.length === 0) {
      console.log("[MYT] No matching admin found")
      return { success: false, error: "Invalid admin credentials" }
    }

    const adminData = result[0] as { id: number; username: string; role: "super_admin" | "course_admin" }

    let assignedCourses: number[] | undefined
    if (adminData.role === "course_admin") {
      const courseAssignments = await sql`
        SELECT course_id FROM admin_course_assignments WHERE admin_id = ${adminData.id}
      `
      assignedCourses = courseAssignments.map((assignment: any) => assignment.course_id)
    }

    const admin: AuthenticatedAdmin = {
      id: adminData.id,
      username: adminData.username,
      role: adminData.role,
      assignedCourses,
    }

    console.log("[MYT] Admin authenticated successfully:", admin.username, admin.role)

    try {
      await sql`
        INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, timestamp)
        VALUES ('admin', ${admin.id}, 'api_access', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, NOW())
      `
    } catch (auditError) {
      console.log("[MYT] Audit log failed (non-critical):", auditError)
      // Continue even if audit log fails
    }

    return { success: true, admin }
  } catch (error) {
    console.error("[MYT] Admin authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

// Helper function to create unauthorized response
export function createAdminUnauthorizedResponse(message = "Admin access required") {
  return NextResponse.json({ success: false, message }, { status: 401 })
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return "unknown"
}

export function hasAccessToCourse(admin: AuthenticatedAdmin, courseId: number): boolean {
  if (admin.role === "super_admin") {
    return true // Super admins have access to all courses
  }

  if (admin.role === "course_admin" && admin.assignedCourses) {
    return admin.assignedCourses.includes(courseId)
  }

  return false
}

export function getAccessibleCourses(admin: AuthenticatedAdmin, allCourses: number[]): number[] {
  if (admin.role === "super_admin") {
    return allCourses
  }

  if (admin.role === "course_admin" && admin.assignedCourses) {
    return allCourses.filter((courseId) => admin.assignedCourses!.includes(courseId))
  }

  return []
}

export async function verifyAdminToken(token: string): Promise<AuthenticatedAdmin | null> {
  try {
    // Decode the token (format: base64 encoded "username:password")
    const credentials = Buffer.from(token, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    if (!username || !password) {
      return null
    }

    // Authenticate admin
    const result = await sql`
      SELECT id, username, role FROM admins WHERE username = ${username} AND password = ${password}
    `

    if (result.length === 0) {
      return null
    }

    const adminData = result[0] as { id: number; username: string; role: "super_admin" | "course_admin" }

    let assignedCourses: number[] | undefined
    if (adminData.role === "course_admin") {
      const courseAssignments = await sql`
        SELECT course_id FROM admin_course_assignments WHERE admin_id = ${adminData.id}
      `
      assignedCourses = courseAssignments.map((assignment: any) => assignment.course_id)
    }

    return {
      id: adminData.id,
      username: adminData.username,
      role: adminData.role,
      assignedCourses,
    }
  } catch (error) {
    console.error("[MYT] Token verification error:", error)
    return null
  }
}
