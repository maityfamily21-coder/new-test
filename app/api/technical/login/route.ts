import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

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
      return NextResponse.json({ success: false, message: "CAPTCHA verification required" }, { status: 400 })
    }

    const captchaValid = await verifyCaptcha(token)
    if (!captchaValid) {
      return NextResponse.json({ success: false, message: "CAPTCHA verification failed" }, { status: 400 })
    }

    if (!username || !password) {
      return NextResponse.json({ success: false, message: "Username and password required" }, { status: 400 })
    }

    const users = await sql`
      SELECT id, username, name, email, password
      FROM technical_team_users
      WHERE username = ${username}
    `

    if (users.length === 0 || users[0].password !== password) {
      return NextResponse.json({ success: false, message: "Invalid username or password" }, { status: 401 })
    }

    const user = users[0]
    const sessionToken = generateSessionToken(username, password)

    return NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("Technical team login error:", error)
    return NextResponse.json({ success: false, message: "Login failed" }, { status: 500 })
  }
}
