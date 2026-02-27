import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error("CAPTCHA verification error:", error)
    return false
  }
}

function generateSessionToken(username: string, password: string): string {
  const credentials = `${username}:${password}`
  return Buffer.from(credentials, "utf-8").toString("base64")
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, token } = await request.json()

    if (!token) {
      return Response.json({ success: false, message: "CAPTCHA verification required" }, { status: 400 })
    }

    const captchaValid = await verifyCaptcha(token)
    if (!captchaValid) {
      return Response.json({ success: false, message: "CAPTCHA verification failed" }, { status: 400 })
    }

    if (!username || !password) {
      return Response.json({ error: "Username and password are required" }, { status: 400 })
    }

    const result = await sql`
      SELECT id, name, email, username, phone_number, is_active
      FROM peon_housekeeping_users
      WHERE username = ${username} AND password = ${password}
    `

    if (result.length === 0) {
      return Response.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    const user = result[0]

    if (!user.is_active) {
      return Response.json({ success: false, message: "Account is inactive" }, { status: 401 })
    }

    const sessionToken = generateSessionToken(username, password)

    return Response.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone_number: user.phone_number,
      },
    })
  } catch (error) {
    console.error("Error during peon login:", error)
    return Response.json({ error: "Login failed" }, { status: 500 })
  }
}
