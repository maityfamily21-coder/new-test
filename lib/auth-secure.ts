import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"
import { verifySignedToken, type SessionPayload } from "./security"

// =====================================================
// CENTRALIZED AUTHORIZATION LAYER (Zero-Trust)
// =====================================================

export interface AuthResult<T = any> {
  success: boolean
  user?: T
  error?: string
  statusCode?: number
}

/**
 * Get client IP address for rate limiting and audit logs
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")

  if (cfConnectingIp) return cfConnectingIp
  if (forwarded) return forwarded.split(",")[0].trim()
  if (realIP) return realIP

  return "unknown"
}

/**
 * Extract and verify signed token from request
 */
function extractAndVerifyToken(request: NextRequest): SessionPayload | null {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  return verifySignedToken(token)
}

// =====================================================
// ADMIN AUTHENTICATION
// =====================================================

export interface AuthenticatedAdmin {
  id: number
  username: string
  role: "super_admin" | "course_admin"
  assignedCourses?: number[]
}

export async function validateAdminAuthSecure(request: NextRequest): Promise<AuthResult<AuthenticatedAdmin>> {
  try {
    const session = extractAndVerifyToken(request)

    if (!session) {
      return { success: false, error: "Invalid or expired token", statusCode: 401 }
    }

    if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "course_admin") {
      return { success: false, error: "Admin access required", statusCode: 403 }
    }

    // Verify user still exists and is active
    const result = await sql`
      SELECT id, username, role FROM admins WHERE id = ${session.userId}
    `

    if (result.length === 0) {
      return { success: false, error: "Admin account not found", statusCode: 401 }
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

    // Audit log
    try {
      await sql`
        INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, timestamp)
        VALUES ('admin', ${admin.id}, 'api_access_secure', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, NOW())
      `
    } catch (auditError) {
      console.log("[Security] Audit log failed (non-critical):", auditError)
    }

    return { success: true, user: admin }
  } catch (error) {
    console.error("[Security] Admin authentication error:", error)
    return { success: false, error: "Authentication failed", statusCode: 500 }
  }
}

// =====================================================
// STUDENT AUTHENTICATION
// =====================================================

export interface AuthenticatedStudent {
  id: number
  full_name: string
  enrollment_number: string
  course_id: number
  current_semester: number
  unique_code?: string
}

export async function validateStudentAuthSecure(request: NextRequest): Promise<AuthResult<AuthenticatedStudent>> {
  try {
    const session = extractAndVerifyToken(request)

    if (!session) {
      return { success: false, error: "Invalid or expired token", statusCode: 401 }
    }

    if (session.role !== "student") {
      return { success: false, error: "Student access required", statusCode: 403 }
    }

    // Verify student still exists
    const result = await sql`
      SELECT id, full_name, enrollment_number, course_id, current_semester, unique_code
      FROM students 
      WHERE id = ${session.userId}
    `

    if (result.length === 0) {
      return { success: false, error: "Student account not found", statusCode: 401 }
    }

    const student = result[0] as AuthenticatedStudent

    return { success: true, user: student }
  } catch (error) {
    console.error("[Security] Student authentication error:", error)
    return { success: false, error: "Authentication failed", statusCode: 500 }
  }
}

// =====================================================
// TUTOR AUTHENTICATION
// =====================================================

export interface AuthenticatedTutor {
  id: number
  name: string
  username: string
  department: string
}

export async function validateTutorAuthSecure(request: NextRequest): Promise<AuthResult<AuthenticatedTutor>> {
  try {
    const session = extractAndVerifyToken(request)

    if (!session) {
      return { success: false, error: "Invalid or expired token", statusCode: 401 }
    }

    if (session.role !== "tutor") {
      return { success: false, error: "Tutor access required", statusCode: 403 }
    }

    const result = await sql`
      SELECT id, name, username, department FROM tutors WHERE id = ${session.userId}
    `

    if (result.length === 0) {
      return { success: false, error: "Tutor account not found", statusCode: 401 }
    }

    return { success: true, user: result[0] as AuthenticatedTutor }
  } catch (error) {
    console.error("[Security] Tutor authentication error:", error)
    return { success: false, error: "Authentication failed", statusCode: 500 }
  }
}

// =====================================================
// TECHNICAL TEAM AUTHENTICATION
// =====================================================

export interface AuthenticatedTechnical {
  id: number
  username: string
  name: string
  email: string
}

export async function validateTechnicalAuthSecure(request: NextRequest): Promise<AuthResult<AuthenticatedTechnical>> {
  try {
    const session = extractAndVerifyToken(request)

    if (!session) {
      return { success: false, error: "Invalid or expired token", statusCode: 401 }
    }

    if (session.role !== "technical") {
      return { success: false, error: "Technical team access required", statusCode: 403 }
    }

    const result = await sql`
      SELECT id, username, name, email FROM technical_team_users WHERE id = ${session.userId}
    `

    if (result.length === 0) {
      return { success: false, error: "Technical account not found", statusCode: 401 }
    }

    return { success: true, user: result[0] as AuthenticatedTechnical }
  } catch (error) {
    console.error("[Security] Technical authentication error:", error)
    return { success: false, error: "Authentication failed", statusCode: 500 }
  }
}

// =====================================================
// PEON/HOUSEKEEPING AUTHENTICATION
// =====================================================

export interface AuthenticatedPeon {
  id: number
  name: string
  username: string
  email: string
}

export async function validatePeonAuthSecure(request: NextRequest): Promise<AuthResult<AuthenticatedPeon>> {
  try {
    const session = extractAndVerifyToken(request)

    if (!session) {
      return { success: false, error: "Invalid or expired token", statusCode: 401 }
    }

    if (session.role !== "peon") {
      return { success: false, error: "Peon/Housekeeping access required", statusCode: 403 }
    }

    const result = await sql`
      SELECT id, name, username, email 
      FROM peon_housekeeping_users 
      WHERE id = ${session.userId} AND is_active = true
    `

    if (result.length === 0) {
      return { success: false, error: "Account not found or inactive", statusCode: 401 }
    }

    return { success: true, user: result[0] as AuthenticatedPeon }
  } catch (error) {
    console.error("[Security] Peon authentication error:", error)
    return { success: false, error: "Authentication failed", statusCode: 500 }
  }
}

// =====================================================
// AUTHORIZATION HELPERS
// =====================================================

/**
 * Check if admin has access to a specific course
 */
export function hasAccessToCourse(admin: AuthenticatedAdmin, courseId: number): boolean {
  if (admin.role === "super_admin") {
    return true
  }

  if (admin.role === "course_admin" && admin.assignedCourses) {
    return admin.assignedCourses.includes(courseId)
  }

  return false
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(message = "Unauthorized", statusCode = 401) {
  return NextResponse.json({ success: false, message }, { status: statusCode })
}
