import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"

export interface AuthenticatedStudent {
  id: number
  enrollment_number: string
  full_name: string
  email: string
  course_id: number
  current_semester: number
  placement_status: string
}

export async function validateStudentAuth(
  request: NextRequest,
  requiredStudentId?: string,
): Promise<{
  success: boolean
  student?: AuthenticatedStudent
  error?: string
}> {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, error: "Missing or invalid authorization header" }
    }

    // Extract credentials from Bearer token (format: "enrollment:password")
    const token = authHeader.substring(7) // Remove "Bearer "
    const credentials = Buffer.from(token, "base64").toString("utf-8")
    const [enrollment, password] = credentials.split(":")

    if (!enrollment || !password) {
      return { success: false, error: "Invalid credentials format" }
    }

    // Authenticate student
    const result = await sql`
      SELECT s.*, c.name as course_name 
      FROM students s
      JOIN courses c ON s.course_id = c.id
      WHERE s.enrollment_number = ${enrollment} AND s.password = ${password}
    `

    if (result.length === 0) {
      return { success: false, error: "Invalid credentials" }
    }

    const student = result[0] as AuthenticatedStudent

    // If a specific student ID is required, verify authorization
    if (requiredStudentId && student.id.toString() !== requiredStudentId) {
      return { success: false, error: "Unauthorized: Cannot access other student's data" }
    }

    return { success: true, student }
  } catch (error) {
    console.error("Authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

// Helper function to create unauthorized response
export function createUnauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ success: false, message }, { status: 401 })
}
