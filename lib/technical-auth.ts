import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"

export interface AuthenticatedTechnicalUser {
  id: number
  username: string
  name: string
  email: string
}

export async function validateTechnicalAuth(request: NextRequest): Promise<{
  success: boolean
  user?: AuthenticatedTechnicalUser
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
      SELECT id, username, name, email FROM technical_team_users WHERE username = ${username} AND password = ${password}
    `

    if (result.length === 0) {
      return { success: false, error: "Invalid credentials" }
    }

    const user = result[0] as AuthenticatedTechnicalUser
    return { success: true, user }
  } catch (error) {
    console.error("Technical team authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export function createTechnicalUnauthorizedResponse(message = "Technical team access required") {
  return NextResponse.json({ success: false, message }, { status: 401 })
}
