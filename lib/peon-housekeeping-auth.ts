import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"

export interface AuthenticatedPeonHousekeeping {
  id: number
  name: string
  username: string
  email: string
}

export async function validatePeonHousekeepingAuth(request: NextRequest): Promise<{
  success: boolean
  user?: AuthenticatedPeonHousekeeping
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
      SELECT id, name, username, email 
      FROM peon_housekeeping_users 
      WHERE username = ${username} AND password = ${password} AND is_active = true
    `

    if (result.length === 0) {
      return { success: false, error: "Invalid credentials" }
    }

    const user = result[0] as AuthenticatedPeonHousekeeping
    return { success: true, user }
  } catch (error) {
    console.error("Peon/Housekeeping authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export function createPeonHousekeepingUnauthorizedResponse(message = "Peon/Housekeeping access required") {
  return NextResponse.json({ success: false, message }, { status: 401 })
}
