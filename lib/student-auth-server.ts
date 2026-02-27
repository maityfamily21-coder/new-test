import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"

export interface AuthenticatedStudent {
  id: number
  full_name: string
  enrollment_number: string
  course_id: number
  current_semester: number
  unique_code?: string
}

export async function validateStudentAuth(request: NextRequest): Promise<{
  success: boolean
  student?: AuthenticatedStudent
  error?: string
}> {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("[v0] Student Auth - Header check:", { hasHeader: !!authHeader })

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[v0] Student Auth - No Bearer token in Authorization header")
      return { success: false, error: "Missing authorization header" }
    }

    // Extract credentials from Bearer token
    const token = authHeader.substring(7)
    console.log("[v0] Student Auth - Token received, length:", token.length)

    let credentials: string
    try {
      credentials = Buffer.from(token, "base64").toString("utf-8")
    } catch (e) {
      console.error("[v0] Student Auth - Failed to decode token:", e)
      return { success: false, error: "Invalid token format" }
    }

    const [enrollmentNumber, password] = credentials.split(":")
    console.log("[v0] Student Auth - Parsed enrollment:", enrollmentNumber)

    if (!enrollmentNumber || !password) {
      console.error("[v0] Student Auth - Invalid format after decode")
      return { success: false, error: "Invalid credentials format" }
    }

    // Authenticate student
    const result = await sql`
      SELECT id, full_name, enrollment_number, course_id, current_semester, unique_code
      FROM students 
      WHERE enrollment_number = ${enrollmentNumber} AND password = ${password}
    `

    console.log("[v0] Student Auth - Query found", result.length, "matching students")

    if (result.length === 0) {
      console.error("[v0] Student Auth - No student found with enrollment:", enrollmentNumber)
      return { success: false, error: "Invalid credentials" }
    }

    const student = result[0] as AuthenticatedStudent
    console.log("[v0] Server - Auth successful for student:", {
      id: student.id,
      enrollment: student.enrollment_number,
    })

    return { success: true, student }
  } catch (error) {
    console.error("[v0] Server - Student authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export function createStudentUnauthorizedResponse(message = "Student access required") {
  return NextResponse.json({ success: false, message }, { status: 401 })
}

// Alias for backward compatibility
export const validateStudentAuthServer = validateStudentAuth
