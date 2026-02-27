import { NextRequest, NextResponse } from "next/server"
import {
  getPasswordResetTokenByOTP,
  verifyPasswordResetOTP,
  logPasswordResetAttempt,
  logPasswordResetAudit,
  validateOTPFormat,
  getFailedOTPAttempts,
} from "@/lib/password-reset"
import { checkRateLimit } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    const { otp, username } = await request.json()

    // Validate input
    if (!otp || !username) {
      return NextResponse.json(
        { success: false, message: "OTP and username are required" },
        { status: 400 },
      )
    }

    if (!validateOTPFormat(otp)) {
      return NextResponse.json(
        { success: false, message: "Invalid OTP format" },
        { status: 400 },
      )
    }

    // Get client IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Check failed attempts (5 per OTP before locking)
    const failedAttempts = await getFailedOTPAttempts("admin", username, 15) // 15 minute window
    if (failedAttempts >= 5) {
      await logPasswordResetAttempt("admin", username, "otp_verify", ip, false)
      return NextResponse.json(
        { success: false, message: "Too many failed attempts. Please request a new OTP." },
        { status: 429 },
      )
    }

    // Rate limiting on OTP verification
    const rateLimitKey = `password-reset:verify:${username}:${otp.substring(0, 3)}`
    const rateLimit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000) // 5 attempts per 15 minutes

    if (!rateLimit.allowed) {
      await logPasswordResetAttempt("admin", username, "otp_verify", ip, false)
      return NextResponse.json(
        { success: false, message: "Too many verification attempts. Please try again later." },
        { status: 429 },
      )
    }

    // Get token by OTP
    const token = await getPasswordResetTokenByOTP(otp)

    if (!token || token.identity_value !== username) {
      await logPasswordResetAttempt("admin", username, "otp_verify", ip, false)
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP" },
        { status: 401 },
      )
    }

    // Verify and update status
    const verified = await verifyPasswordResetOTP(token.id)

    if (!verified) {
      await logPasswordResetAttempt("admin", username, "otp_verify", ip, false)
      return NextResponse.json(
        { success: false, message: "OTP verification failed" },
        { status: 401 },
      )
    }

    // Log successful OTP verification
    await logPasswordResetAttempt("admin", username, "otp_verify", ip, true)
    await logPasswordResetAudit("admin", token.user_id, username, "otp_verified", ip)

    console.log(`[Password Reset] OTP verified for admin: ${username}`)

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      tokenId: token.id,
    })
  } catch (error) {
    console.error("[Password Reset] Admin verify OTP error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 },
    )
  }
}
