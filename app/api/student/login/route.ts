import { type NextRequest, NextResponse } from "next/server"
import { authenticateStudent } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { enrollmentNumber, password, captchaToken } = await request.json()

    if (!enrollmentNumber || !password) {
      return NextResponse.json(
        { success: false, message: "Enrollment number and password are required" },
        { status: 400 },
      )
    }

    if (!captchaToken) {
      return NextResponse.json({ success: false, message: "CAPTCHA verification failed" }, { status: 400 })
    }

    // Verify Turnstile token with Cloudflare
    try {
      const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }),
      })

      const turnstileData = await turnstileResponse.json()

      if (!turnstileData.success) {
        console.log("[v0] Turnstile verification failed:", turnstileData)
        return NextResponse.json(
          { success: false, message: "CAPTCHA verification failed. Please try again." },
          { status: 400 },
        )
      }

      console.log("[v0] Turnstile verified successfully")
    } catch (captchaError) {
      console.error("[v0] Turnstile verification error:", captchaError)
      return NextResponse.json({ success: false, message: "CAPTCHA verification error" }, { status: 500 })
    }

    // Authenticate
    const student = await authenticateStudent(enrollmentNumber, password)

    if (student) {
      console.log("[v0] Login success for:", enrollmentNumber)

      const cookieStore = cookies()
      const userData = JSON.stringify({
        id: student.id,
        enrollment: student.enrollment_number,
        role: "student",
      })

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      }

      // --- UNIVERSAL COOKIE SETTING ---
      // We set all 3 common names to ensure your other API routes work
      // regardless of what they are looking for ('session', 'token', or 'student_token')
      cookieStore.set("session", userData, cookieOptions)
      cookieStore.set("token", userData, cookieOptions)
      cookieStore.set("student_token", userData, cookieOptions)

      return NextResponse.json({
        success: true,
        message: "Login successful",
        student: {
          id: student.id,
          full_name: student.full_name,
          enrollment_number: student.enrollment_number,
          course_id: student.course_id,
          // Add other student fields here
        },
        credentials: {
          enrollment: enrollmentNumber,
          password: password,
        },
      })
    } else {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
