import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import {
  getPasswordResetTokenByOTP,
  isPasswordResetTokenVerified,
  markPasswordResetTokenAsUsed,
  logPasswordResetAttempt,
  logPasswordResetAudit,
  generateSecurePassword,
  updatePasswordResetStatus,
} from "@/lib/password-reset"
import { sendPasswordResetConfirmation } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { tokenId, otp, enrollmentNumber } = await request.json()

    // Validate input - tokenId is required (from verified OTP step)
    if (!tokenId && !otp) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please start over." },
        { status: 400 },
      )
    }

    if (!enrollmentNumber) {
      return NextResponse.json(
        { success: false, message: "Enrollment number is required" },
        { status: 400 },
      )
    }

    // Get client IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Get token - prefer tokenId (already verified in previous step)
    let token: any = null
    
    if (tokenId) {
      // Token already verified, retrieve it from database by ID
      const result = await sql`SELECT * FROM password_reset_tokens WHERE id = ${tokenId} AND user_type = 'student'`
      token = result.length > 0 ? result[0] : null
    } else if (otp) {
      // Fallback to OTP-based lookup (legacy support)
      token = await getPasswordResetTokenByOTP(otp)
    }

    if (!token) {
      await logPasswordResetAttempt("student", enrollmentNumber, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "Invalid or expired session. Please request a new OTP." },
        { status: 401 },
      )
    }

    // Verify identity matches
    if (token.identity_value !== enrollmentNumber) {
      await logPasswordResetAttempt("student", enrollmentNumber, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "Enrollment number does not match the OTP request." },
        { status: 401 },
      )
    }

    // Check if token has been verified
    if (token.status !== "verified") {
      if (token.status === "used") {
        await logPasswordResetAttempt("student", enrollmentNumber, "password_reset", ip, false)
        return NextResponse.json(
          { success: false, message: "This OTP has already been used. Please request a new one." },
          { status: 401 },
        )
      }
      await logPasswordResetAttempt("student", enrollmentNumber, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "OTP must be verified first" },
        { status: 401 },
      )
    }

    // Generate secure password
    const newPassword = generateSecurePassword()

    // Update student password (plain text - no hashing)
    const updateResult = await sql`UPDATE students SET password = ${newPassword} WHERE id = ${token.user_id} RETURNING id, email, full_name`

    if (updateResult.length === 0) {
      await logPasswordResetAttempt("student", enrollmentNumber, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "Failed to reset password" },
        { status: 500 },
      )
    }

    const student = updateResult[0]

    // Update password reset status
    await updatePasswordResetStatus("student", token.user_id as number, "recently_reset")

    // Mark token as used
    await markPasswordResetTokenAsUsed(token.id)

    // Send confirmation email with new password
    await sendPasswordResetConfirmation(student.email, newPassword, student.full_name)

    // Log successful reset
    await logPasswordResetAttempt("student", enrollmentNumber, "password_reset", ip, true)
    await logPasswordResetAudit("student", token.user_id, enrollmentNumber, "password_reset", ip)

    return NextResponse.json({
      success: true,
      message: "Password reset successful. A confirmation email has been sent.",
      newPassword: newPassword,
    })
  } catch (error) {
    console.error("[Password Reset] Reset password error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, message: `An error occurred: ${errorMessage}` },
      { status: 500 },
    )
  }
}
