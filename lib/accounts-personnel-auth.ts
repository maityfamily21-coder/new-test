import { type NextRequest, NextResponse } from "next/server"
import { sql } from "./db"
import { jwtVerify } from "jose"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export interface AuthenticatedAccountsPersonnel {
  id: number
  username: string
  name: string
}

// For Bearer token auth (sent via Authorization header)
export async function verifyAccountsPersonnelAuth(request: Request): Promise<{
  authenticated: boolean
  personnel?: AuthenticatedAccountsPersonnel
}> {
  try {
    // Check for Bearer token in Authorization header
    const authHeader = request.headers.get("authorization")
    let token: string | null = null
    let isJWT = false

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
      console.log("[v0] Bearer token found in Authorization header, length:", token.length)
      
      // Check if it looks like a JWT (has dots) or a base64 token
      isJWT = token.includes(".")
    } else {
      // Fallback to cookie-based auth
      const cookieHeader = request.headers.get("cookie")
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split("; ").map((c) => {
            const [key, ...v] = c.split("=")
            return [key, v.join("=")]
          })
        )
        token = cookies.accounts_personnel_token
        isJWT = true // Cookies are always JWT
      }
    }

    if (!token) {
      console.error("[v0] No token found in Authorization header or cookies")
      return { authenticated: false }
    }

    // If it's a JWT token (contains dots), verify it as JWT
    if (isJWT && token.includes(".")) {
      const { payload } = await jwtVerify(token, SECRET_KEY)
      
      return {
        authenticated: true,
        personnel: {
          id: payload.id as number,
          username: payload.username as string,
          name: payload.name as string,
        },
      }
    }
    
    // Otherwise it's a username:password Bearer token, query database
    console.log("[v0] Treating token as basic auth credentials")
    const credentials = Buffer.from(token, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    if (!username || !password) {
      console.error("[v0] Invalid credentials format")
      return { authenticated: false }
    }

    const result = await sql`
      SELECT id, username, name FROM administrative_personnel
      WHERE username = ${username} AND password = ${password} AND is_active = TRUE
    `

    if (result.length === 0) {
      console.error("[v0] Accounts personnel not found or invalid credentials")
      return { authenticated: false }
    }

    const personnel = result[0]
    return {
      authenticated: true,
      personnel: {
        id: personnel.id as number,
        username: personnel.username as string,
        name: personnel.name as string,
      },
    }
  } catch (error) {
    console.error("[v0] Accounts personnel auth verification error:", error)
    return { authenticated: false }
  }
}

// For NextRequest with validation (used in API routes)
export async function validateAccountsPersonnelAuth(request: NextRequest): Promise<{
  success: boolean
  personnel?: AuthenticatedAccountsPersonnel
  error?: string
}> {
  try {
    const token = request.cookies.get("accounts_personnel_token")?.value

    if (!token) {
      return { success: false, error: "Not authenticated" }
    }

    const { payload } = await jwtVerify(token, SECRET_KEY)

    const personnel: AuthenticatedAccountsPersonnel = {
      id: payload.id as number,
      username: payload.username as string,
      name: payload.name as string,
    }

    return { success: true, personnel }
  } catch (error) {
    console.error("[Accounts Personnel Auth] Authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export function createAccountsPersonnelUnauthorizedResponse(message = "Accounts personnel access required") {
  return NextResponse.json({ success: false, message }, { status: 401 })
}
