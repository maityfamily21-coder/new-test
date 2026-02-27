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
    console.error("[MYT] CAPTCHA verification error:", error)
    return false
  }
}

function generateSessionToken(username: string, password: string): string {
  const credentials = `${username}:${password}`
  return Buffer.from(credentials, "utf-8").toString("base64")
}

export async function POST(request: NextRequest) {
  try {
    console.log("[MYT] Admin login attempt started")
    const { username, password, token } = await request.json()
    console.log("[MYT] Received credentials:", { username, passwordLength: password?.length })

    if (!token) {
      console.log("[MYT] Missing CAPTCHA token")
      return NextResponse.json({ success: false, message: "CAPTCHA verification required" }, { status: 400 })
    }

    const captchaValid = await verifyCaptcha(token)
    if (!captchaValid) {
      console.log("[MYT] CAPTCHA verification failed")
      return NextResponse.json({ success: false, message: "CAPTCHA verification failed" }, { status: 400 })
    }

    if (!username || !password) {
      console.log("[MYT] Missing credentials")
      return NextResponse.json({ success: false, message: "Username and password are required" }, { status: 400 })
    }

    console.log("[MYT] Querying database for admin...")
    const result = await sql`
      SELECT id, username, role FROM admins WHERE username = ${username} AND password = ${password}
    `
    console.log("[MYT] Database query result:", { found: result.length > 0, resultCount: result.length })

    if (result.length > 0) {
      const admin = result[0] as { id: number; username: string; role: "super_admin" | "course_admin" }
      console.log("[MYT] Admin found, role:", admin.role)

      let assignedCourses: number[] | undefined
      if (admin.role === "course_admin") {
        const courseAssignments = await sql`
          SELECT course_id FROM admin_course_assignments WHERE admin_id = ${admin.id}
        `
        assignedCourses = courseAssignments.map((assignment: any) => assignment.course_id)
        console.log("[MYT] Course admin assigned courses:", assignedCourses)
      }

      try {
        await sql`
          INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, timestamp)
          VALUES ('admin', ${admin.id}, 'login_success', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, NOW())
        `
        console.log("[MYT] Security audit log inserted successfully")
      } catch (auditError) {
        console.log("[MYT] Security audit log failed:", auditError)
      }

      const sessionToken = generateSessionToken(username, password)
      console.log("[MYT] Login successful, returning response")

      return NextResponse.json({
        success: true,
        message: "Login successful",
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          assignedCourses,
        },
        token: sessionToken,
      })
    } else {
      console.log("[MYT] Invalid credentials, logging failure...")

      try {
        await sql`
          INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, timestamp)
          VALUES ('admin', NULL, 'login_failed', ${getClientIP(request)}, ${request.headers.get("user-agent") || "unknown"}, NOW())
        `
      } catch (auditError) {
        console.log("[MYT] Failed login audit log failed:", auditError)
      }

      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }
  } catch (error) {
    console.error("[MYT] Admin login error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return "unknown"
}
