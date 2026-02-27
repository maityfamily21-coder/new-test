import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"

export interface AuthenticatedTutor {
  id: number
  name: string
  username: string
  department: string
}

export async function validateTutorAuth(request: NextRequest): Promise<{
  success: boolean
  tutor?: AuthenticatedTutor
  error?: string
}> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, error: "Missing or invalid authorization header" }
    }

    const token = authHeader.substring(7)
    const credentials = Buffer.from(token, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    if (!username || !password) {
      return { success: false, error: "Invalid credentials format" }
    }

    const result = await sql`
      SELECT id, name, username, department FROM tutors WHERE username = ${username} AND password = ${password}
    `

    if (result.length === 0) {
      return { success: false, error: "Invalid credentials" }
    }

    const tutor = result[0] as AuthenticatedTutor
    return { success: true, tutor }
  } catch (error) {
    console.error("Tutor authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export function createTutorUnauthorizedResponse(message = "Tutor access required") {
  return NextResponse.json({ success: false, message }, { status: 401 })
}
