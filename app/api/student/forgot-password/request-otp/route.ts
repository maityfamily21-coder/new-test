import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  createPasswordResetToken,
  logPasswordResetAttempt,
  logPasswordResetAudit,
  validateEnrollmentNumber,
  getRecentPasswordResetAttempts,
} from "@/lib/password-reset"
import { sendPasswordResetOTP } from "@/lib/email"
import { checkRateLimit } from "@/lib/security"

const GENERIC_RESPONSE = "If the user exists in our system, a password reset OTP has been sent to the registered email address."

export async function POST(request: NextRequest) {
  try {
    const { enrollmentNumber } = await request.json()

    // Validate input
    if (!enrollmentNumber) {
      return NextResponse.json(
        { success: false, message: "Enrollment number is required" },
        { status: 400 },
      )
    }

    const { isValid, sanitizedValue: sanitizedEnrollment } = validateEnrollmentNumber(enrollmentNumber)
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid enrollment number format" },
        { status: 400 },
      )
    }

    // Get client IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Rate limiting: Check rate limit (3 per hour)
    const rateLimitKey = `password-reset:student:${sanitizedEnrollment}`
    const rateLimit = checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000) // 3 attempts per hour

    if (!rateLimit.allowed) {
      await logPasswordResetAttempt("student", sanitizedEnrollment, "otp_request", ip, false)
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429 },
      )
    }

    // Find student by enrollment number
    const studentResult = await sql`SELECT id, full_name, email, enrollment_number FROM students WHERE enrollment_number = ${sanitizedEnrollment}`

    // Always return generic message (don't reveal if student exists)
    const genericMessage = GENERIC_RESPONSE

    if (studentResult.length === 0) {
      // Student not found - still log and return generic message
      await logPasswordResetAttempt("student", sanitizedEnrollment, "otp_request", ip, false)
      return NextResponse.json({
        success: true,
        message: genericMessage,
      })
    }

    const student = studentResult[0]

    // Create OTP token
    const token = await createPasswordResetToken("student", "enrollment_number", sanitizedEnrollment, student.id)

    // Send OTP email
    const emailResult = await sendPasswordResetOTP(student.email, token.otp, student.full_name)

    if (!emailResult.success) {
      await logPasswordResetAttempt("student", sanitizedEnrollment, "otp_request", ip, false)
      await logPasswordResetAudit("student", student.id, sanitizedEnrollment, "otp_requested", ip)
      return NextResponse.json(
        { success: false, message: "Failed to send OTP. Please try again." },
        { status: 500 },
      )
    }

    // Log successful attempt
    await logPasswordResetAttempt("student", sanitizedEnrollment, "otp_request", ip, true)
    await logPasswordResetAudit("student", student.id, sanitizedEnrollment, "otp_requested", ip)

    console.log(`[Password Reset] OTP sent for student: ${sanitizedEnrollment}`)

    return NextResponse.json({
      success: true,
      message: genericMessage,
    })
  } catch (error) {
    console.error("[Password Reset] Request OTP error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 },
    )
  }
}
