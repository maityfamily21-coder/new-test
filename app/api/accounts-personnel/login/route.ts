import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { SignJWT } from "jose"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

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

export async function POST(request: Request) {
  try {
    const { username, password, token } = await request.json()

    console.log("[v0] Accounts personnel login attempt:", { username, hasToken: !!token })

    if (!token) {
      return NextResponse.json({ message: "CAPTCHA verification required", success: false }, { status: 400 })
    }

    const captchaValid = await verifyCaptcha(token)
    console.log("[v0] CAPTCHA validation result:", { captchaValid })
    
    if (!captchaValid) {
      return NextResponse.json({ message: "CAPTCHA verification failed", success: false }, { status: 400 })
    }

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    // Query the administrative_personnel table
    const result = await sql`
      SELECT id, username, password, name, email, is_active
      FROM administrative_personnel
      WHERE username = ${username} AND password = ${password} AND is_active = TRUE
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Invalid credentials", success: false }, { status: 401 })
    }

    const personnel = result[0]

    // Create JWT token
    const tokenJwt = await new SignJWT({ 
      id: personnel.id, 
      username: personnel.username,
      name: personnel.name,
      role: "accounts_personnel"
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(SECRET_KEY)

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      token: tokenJwt,
      personnel: {
        id: personnel.id,
        name: personnel.name,
        username: personnel.username,
        email: personnel.email,
      },
    })

    response.cookies.set("accounts_personnel_token", tokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
    })

    return response
  } catch (error) {
    console.error("[v0] Accounts personnel login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
