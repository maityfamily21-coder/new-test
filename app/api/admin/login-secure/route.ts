import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  createSignedToken,
  verifyPassword,
  hashPassword,
  checkRateLimit,
  validateUsername,
  validatePassword,
} from "@/lib/security"
import { getClientIP } from "@/lib/auth-secure"

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
    console.error("[Security] CAPTCHA verification error:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)

  try {
    // Rate limiting: 5 login attempts per minute per IP
    const rateLimit = checkRateLimit(`login:admin:${clientIP}`, 5, 60000)

    if (!rateLimit.allowed) {
      console.log(`[Security] Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json(
        {
          success: false,
          message: "Too many login attempts. Please try again later.",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { username: rawUsername, password: rawPassword, token } = body

    // CAPTCHA verification
    if (!token) {
      return NextResponse.json({ success: false, message: "CAPTCHA verification required" }, { status: 400 })
    }

    const captchaValid = await verifyCaptcha(token)
    if (!captchaValid) {
      return NextResponse.json({ success: false, message: "CAPTCHA verification failed" }, { status: 400 })
    }

    // Input validation
    const usernameValidation = validateUsername(rawUsername)
    if (!usernameValidation.isValid) {
      return NextResponse.json({ success: false, message: usernameValidation.errors.join(", ") }, { status: 400 })
    }

    const passwordValidation = validatePassword(rawPassword)
    if (!passwordValidation.isValid) {
      return NextResponse.json({ success: false, message: passwordValidation.errors.join(", ") }, { status: 400 })
    }

    const username = usernameValidation.sanitizedValue
    const password = rawPassword // Don't sanitize passwords

    // Query database - NEVER return password in SELECT
    const result = await sql`
      SELECT id, username, role, password, password_hash FROM admins 
      WHERE username = ${username}
    `

    if (result.length === 0) {
      // Log failed attempt
      await sql`
        INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, success, error_message, timestamp)
        VALUES ('admin', NULL, 'login_failed', ${clientIP}, ${request.headers.get("user-agent") || "unknown"}, false, 'Invalid username', NOW())
      `

      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    const admin = result[0] as {
      id: number
      username: string
      role: "super_admin" | "course_admin"
      password: string
      password_hash: string | null
    }

    let isAuthenticated = false

    // Check if using new hashed password system
    if (admin.password_hash) {
      isAuthenticated = verifyPassword(password, admin.password_hash)
    } else {
      // Legacy plain-text password (to be migrated)
      isAuthenticated = admin.password === password

      // Migrate to hashed password on successful login
      if (isAuthenticated) {
        const hashedPassword = hashPassword(password)
        await sql`
          UPDATE admins 
          SET password_hash = ${hashedPassword}
          WHERE id = ${admin.id}
        `
        console.log(`[Security] Migrated admin ${admin.username} to hashed password`)
      }
    }

    if (!isAuthenticated) {
      // Log failed attempt
      await sql`
        INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, success, error_message, timestamp)
        VALUES ('admin', ${admin.id}, 'login_failed', ${clientIP}, ${request.headers.get("user-agent") || "unknown"}, false, 'Invalid password', NOW())
      `

      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    // Get assigned courses for course admins
    let assignedCourses: number[] | undefined
    if (admin.role === "course_admin") {
      const courseAssignments = await sql`
        SELECT course_id FROM admin_course_assignments WHERE admin_id = ${admin.id}
      `
      assignedCourses = courseAssignments.map((assignment: any) => assignment.course_id)
    }

    // Create signed token
    const signedToken = createSignedToken({
      userId: admin.id,
      role: admin.role === "super_admin" ? "super_admin" : "course_admin",
      permissions: admin.role === "super_admin" ? ["all"] : ["course_management"],
    })

    // Log successful login
    await sql`
      INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, success, timestamp)
      VALUES ('admin', ${admin.id}, 'login_success', ${clientIP}, ${request.headers.get("user-agent") || "unknown"}, true, NOW())
    `

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        assignedCourses,
      },
      token: signedToken,
    })

    // Set secure cookie
    response.cookies.set("admin_session", signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[Security] Admin login error:", error)

    // Log error
    await sql`
      INSERT INTO security_audit_log (user_type, user_id, action, ip_address, user_agent, success, error_message, timestamp)
      VALUES ('admin', NULL, 'login_error', ${clientIP}, ${request.headers.get("user-agent") || "unknown"}, false, ${error.message}, NOW())
    `

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
