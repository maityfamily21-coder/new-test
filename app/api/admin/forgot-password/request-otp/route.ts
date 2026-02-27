import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  createPasswordResetToken,
  logPasswordResetAttempt,
  logPasswordResetAudit,
  validateUsername,
} from "@/lib/password-reset"
import { sendPasswordResetOTP } from "@/lib/email"
import { checkRateLimit } from "@/lib/security"

const GENERIC_RESPONSE = "If the user exists in our system, a password reset OTP has been sent to the registered email address."

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    // Validate input
    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username is required" },
        { status: 400 },
      )
    }

    const { isValid, sanitizedValue: sanitizedUsername } = validateUsername(username)
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid username format" },
        { status: 400 },
      )
    }

    // Get client IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Rate limiting: Check rate limit (3 per hour)
    const rateLimitKey = `password-reset:admin:${sanitizedUsername}`
    const rateLimit = checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000) // 3 attempts per hour

    if (!rateLimit.allowed) {
      await logPasswordResetAttempt("admin", sanitizedUsername, "otp_request", ip, false)
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429 },
      )
    }

    // Find admin by username - need to get email, which might not exist in all records
    const adminResult = await sql`
      SELECT id, username FROM admins WHERE username = ${sanitizedUsername}
    `

    // Always return generic message (don't reveal if admin exists)
    const genericMessage = GENERIC_RESPONSE

    if (adminResult.length === 0) {
      // Admin not found - still log and return generic message
      await logPasswordResetAttempt("admin", sanitizedUsername, "otp_request", ip, false)
      return NextResponse.json({
        success: true,
        message: genericMessage,
      })
    }

    const admin = adminResult[0] as { id: number; username: string }

    // For admin, we need to find email - may need to add email field to admins table
    // For now, we'll use a placeholder or skip email sending if email doesn't exist
    const emailResult = await sql`
      SELECT email FROM admins WHERE id = ${admin.id}
    `

    let adminEmail = emailResult.length > 0 ? emailResult[0].email : null

    if (!adminEmail) {
      // If no email in admins table, return generic message but don't send OTP
      await logPasswordResetAttempt("admin", sanitizedUsername, "otp_request", ip, false)
      return NextResponse.json({
        success: true,
        message: genericMessage,
      })
    }

    // Create OTP token
    const token = await createPasswordResetToken("admin", "username", sanitizedUsername, admin.id)

    // Send OTP email
    const emailSendResult = await sendPasswordResetOTP(adminEmail, token.otp, sanitizedUsername)

    if (!emailSendResult.success) {
      await logPasswordResetAttempt("admin", sanitizedUsername, "otp_request", ip, false)
      await logPasswordResetAudit("admin", admin.id, sanitizedUsername, "otp_requested", ip)
      return NextResponse.json(
        { success: false, message: "Failed to send OTP. Please try again." },
        { status: 500 },
      )
    }

    // Log successful attempt
    await logPasswordResetAttempt("admin", sanitizedUsername, "otp_request", ip, true)
    await logPasswordResetAudit("admin", admin.id, sanitizedUsername, "otp_requested", ip)

    console.log(`[Password Reset] OTP sent for admin: ${sanitizedUsername}`)

    return NextResponse.json({
      success: true,
      message: genericMessage,
    })
  } catch (error) {
    console.error("[Password Reset] Admin request OTP error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 },
    )
  }
}
