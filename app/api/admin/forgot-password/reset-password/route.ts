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
    const { tokenId, otp, username } = await request.json()

    // Validate input - tokenId is required (from verified OTP step)
    if (!tokenId && !otp) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please start over." },
        { status: 400 },
      )
    }

    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username is required" },
        { status: 400 },
      )
    }

    // Get client IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Get token - prefer tokenId (already verified in previous step)
    let token: any = null
    
    if (tokenId) {
      // Token already verified, retrieve it from database by ID
      const result = await sql`SELECT * FROM password_reset_tokens WHERE id = ${tokenId} AND user_type = 'admin'`
      token = result.length > 0 ? result[0] : null
    } else if (otp) {
      // Fallback to OTP-based lookup (legacy support)
      token = await getPasswordResetTokenByOTP(otp)
    }

    if (!token) {
      await logPasswordResetAttempt("admin", username, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "Invalid or expired session. Please request a new OTP." },
        { status: 401 },
      )
    }

    // Verify identity matches
    if (token.identity_value !== username) {
      await logPasswordResetAttempt("admin", username, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "Username does not match the OTP request." },
        { status: 401 },
      )
    }

    // Check if token has been verified
    if (token.status !== "verified") {
      if (token.status === "used") {
        await logPasswordResetAttempt("admin", username, "password_reset", ip, false)
        return NextResponse.json(
          { success: false, message: "This OTP has already been used. Please request a new one." },
          { status: 401 },
        )
      }
      await logPasswordResetAttempt("admin", username, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "OTP must be verified first" },
        { status: 401 },
      )
    }

    // Generate secure password
    const newPassword = generateSecurePassword()

    // Update admin password (plain text - no hashing)
    const updateResult = await sql`
      UPDATE admins 
      SET password = ${newPassword}, updated_at = NOW() 
      WHERE id = ${token.user_id} 
      RETURNING id, username
    `

    if (updateResult.length === 0) {
      await logPasswordResetAttempt("admin", username, "password_reset", ip, false)
      return NextResponse.json(
        { success: false, message: "Failed to reset password" },
        { status: 500 },
      )
    }

    const admin = updateResult[0] as { id: number; username: string }

    // Try to send email if email field exists
    try {
      const adminWithEmail = await sql`
        SELECT email FROM admins WHERE id = ${admin.id}
      `

      if (adminWithEmail.length > 0 && adminWithEmail[0].email) {
        await sendPasswordResetConfirmation(adminWithEmail[0].email, newPassword, username)
      }
    } catch (emailError) {
      console.error("[Password Reset] Failed to send confirmation email:", emailError)
    }

    // Update password reset status
    await updatePasswordResetStatus("admin", token.user_id as number, "recently_reset")

    // Mark token as used
    await markPasswordResetTokenAsUsed(token.id)

    // Log successful reset
    await logPasswordResetAttempt("admin", username, "password_reset", ip, true)
    await logPasswordResetAudit("admin", token.user_id, username, "password_reset", ip)

    console.log(`[Password Reset] Password reset successful for admin: ${username}`)

    return NextResponse.json({
      success: true,
      message: "Password reset successful. A confirmation email has been sent.",
      newPassword: newPassword,
    })
  } catch (error) {
    console.error("[Password Reset] Admin reset password error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 },
    )
  }
}
