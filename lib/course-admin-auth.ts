import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"

export interface AuthenticatedCourseAdmin {
  id: number
  username: string
  name: string
  role: "super_admin" | "course_admin" | "personnel"
  assigned_course_ids: number[]
}

export async function validateCourseAdminAuth(request: NextRequest): Promise<{
  success: boolean
  admin?: AuthenticatedCourseAdmin
  error?: string
}> {
  try {
    console.log("[MYT] Course admin auth validation started")

    const authHeader = request.headers.get("authorization")
    console.log("[MYT] Auth header:", authHeader ? "Present" : "Missing")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[MYT] Invalid auth header format")
      return { success: false, error: "Missing or invalid authorization header" }
    }

    const token = authHeader.substring(7)
    const credentials = Buffer.from(token, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    console.log("[MYT] Extracted username:", username)

    if (!username || !password) {
      console.log("[MYT] Invalid credentials format")
      return { success: false, error: "Invalid credentials format" }
    }

    // Check both admins and administrative_personnel tables
    console.log("[MYT] Querying database for admin/personnel")

    // First check super admin table
    const superAdminResult = await sql`
      SELECT id, username, 'super_admin' as role, NULL as name, ARRAY[]::INTEGER[] as assigned_course_ids
      FROM admins 
      WHERE username = ${username} AND password = ${password}
    `

    if (superAdminResult.length > 0) {
      const admin = superAdminResult[0] as AuthenticatedCourseAdmin
      console.log("[MYT] Super admin authenticated successfully:", admin.username)

      try {
        await sql`
          INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, admin_role, timestamp)
          VALUES ('admin', ${admin.id}, 'api_access', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, 'super_admin', NOW())
        `
      } catch (auditError) {
        console.log("[MYT] Audit log failed (non-critical):", auditError)
      }

      return { success: true, admin }
    }

    // Check administrative personnel table
    const personnelResult = await sql`
      SELECT 
        id, 
        username, 
        name,
        COALESCE(role, 'personnel') as role, 
        COALESCE(assigned_course_ids, ARRAY[]::INTEGER[]) as assigned_course_ids
      FROM administrative_personnel 
      WHERE username = ${username} AND password = ${password} AND is_active = true
    `

    console.log("[MYT] Personnel query result count:", personnelResult.length)

    if (personnelResult.length === 0) {
      console.log("[MYT] No matching admin/personnel found")
      return { success: false, error: "Invalid credentials" }
    }

    const admin = personnelResult[0] as AuthenticatedCourseAdmin
    console.log("[MYT] Personnel authenticated successfully:", admin.username, "Role:", admin.role)

    try {
      await sql`
        INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, admin_role, timestamp)
        VALUES ('personnel', ${admin.id}, 'api_access', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, ${admin.role}, NOW())
      `
    } catch (auditError) {
      console.log("[MYT] Audit log failed (non-critical):", auditError)
    }

    return { success: true, admin }
  } catch (error) {
    console.error("[MYT] Course admin authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export async function verifyCourseAdminAuth(request: NextRequest): Promise<{
  success: boolean
  admin?: AuthenticatedCourseAdmin
  error?: string
}> {
  return validateCourseAdminAuth(request)
}

export async function verifySuperAdminAuth(request: NextRequest): Promise<{
  authenticated: boolean
  admin?: AuthenticatedCourseAdmin
  error?: string
}> {
  const result = await validateCourseAdminAuth(request)

  if (!result.success || !result.admin) {
    return { authenticated: false, error: result.error }
  }

  if (result.admin.role !== "super_admin") {
    return { authenticated: false, error: "Access denied: Super Admin role required" }
  }

  return { authenticated: true, admin: result.admin }
}

// Validate that admin has access to a specific course
export function validateCourseAccess(admin: AuthenticatedCourseAdmin, courseId: number): boolean {
  // Super admins have access to all courses
  if (admin.role === "super_admin") {
    return true
  }

  // Course admins must have the course in their assigned list
  if (admin.role === "course_admin") {
    return admin.assigned_course_ids.includes(courseId)
  }

  // Personnel role has no course management access
  return false
}

// Validate that admin has access to multiple courses
export function validateMultipleCourseAccess(admin: AuthenticatedCourseAdmin, courseIds: number[]): boolean {
  if (admin.role === "super_admin") {
    return true
  }

  if (admin.role === "course_admin") {
    return courseIds.every((courseId) => admin.assigned_course_ids.includes(courseId))
  }

  return false
}

// Get SQL filter for course-specific queries
export function getCourseFilter(
  admin: AuthenticatedCourseAdmin,
  tableAlias = "s",
): { hasFilter: boolean; filter: string; params: number[] } {
  if (admin.role === "super_admin") {
    return { hasFilter: false, filter: "", params: [] }
  }

  if (admin.role === "course_admin" && admin.assigned_course_ids.length > 0) {
    const courseIds = admin.assigned_course_ids
    const placeholders = courseIds.map((_, i) => `$${i + 1}`).join(",")
    return {
      hasFilter: true,
      filter: `${tableAlias}.course_id IN (${placeholders})`,
      params: courseIds,
    }
  }

  // No access - return impossible condition
  return { hasFilter: true, filter: "1=0", params: [] }
}

export function createCourseAdminUnauthorizedResponse(message = "Access denied") {
  return NextResponse.json({ success: false, message }, { status: 403 })
}

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
