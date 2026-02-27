import { randomBytes } from "crypto"
import { sql } from "@/lib/db"

// =====================================================
// OTP GENERATION & VALIDATION
// =====================================================

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  // Generate 6 random digits
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  return otp
}

/**
 * Validate OTP format (6 digits)
 */
export function validateOTPFormat(otp: string): boolean {
  const otpRegex = /^\d{6}$/
  return otpRegex.test(otp)
}

/**
 * Calculate OTP expiry time (5 minutes from now)
 */
export function calculateOTPExpiry(): Date {
  const expiryTime = new Date()
  expiryTime.setMinutes(expiryTime.getMinutes() + 5)
  return expiryTime
}

// =====================================================
// PASSWORD GENERATION & VALIDATION
// =====================================================

/**
 * Generate a secure random password with required character types
 * Format: 8 characters with at least one uppercase, one lowercase, one number, and one special char
 */
export function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const special = "@#"

  // Ensure at least one character from each category
  const characters = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ]

  // Fill remaining characters with random selections from all categories
  const allChars = uppercase + lowercase + numbers + special
  for (let i = characters.length; i < 8; i++) {
    characters.push(allChars[Math.floor(Math.random() * allChars.length)])
  }

  // Shuffle the array
  for (let i = characters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[characters[i], characters[j]] = [characters[j], characters[i]]
  }

  return characters.join("")
}

/**
 * Validate username format for admin/staff login
 */
export function validateUsername(username: string): { isValid: boolean; errors: string[]; sanitizedValue: string } {
  const errors: string[] = []
  const sanitized = username.trim()

  if (!sanitized) {
    errors.push("Username is required")
    return { isValid: false, errors, sanitizedValue: "" }
  }

  if (sanitized.length < 3) {
    errors.push("Username must be at least 3 characters long")
  }

  if (sanitized.length > 50) {
    errors.push("Username must not exceed 50 characters")
  }

  const usernameRegex = /^[a-zA-Z0-9_.-]+$/
  if (!usernameRegex.test(sanitized)) {
    errors.push("Username can only contain letters, numbers, dots, hyphens, and underscores")
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  }
}

/**
 * Validate enrollment number format for student login
 */
export function validateEnrollmentNumber(enrollmentNumber: string): { isValid: boolean; errors: string[]; sanitizedValue: string } {
  const errors: string[] = []
  const sanitized = enrollmentNumber.trim().toUpperCase()

  if (!sanitized) {
    errors.push("Enrollment number is required")
    return { isValid: false, errors, sanitizedValue: "" }
  }

  if (sanitized.length < 5) {
    errors.push("Enrollment number must be at least 5 characters long")
  }

  if (sanitized.length > 20) {
    errors.push("Enrollment number must not exceed 20 characters")
  }

  const enrollmentRegex = /^[a-zA-Z0-9]+$/
  if (!enrollmentRegex.test(sanitized)) {
    errors.push("Enrollment number can only contain letters and numbers")
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  }
}

/**
 * Validate password format - must be at least 8 characters with required character types
 */
export function validateNewPasswordFormat(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!password) {
    errors.push("Password is required")
    return { isValid: false, errors }
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[@#]/.test(password)

  if (!hasUppercase) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!hasLowercase) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!hasNumber) {
    errors.push("Password must contain at least one number")
  }

  if (!hasSpecial) {
    errors.push("Password must contain at least one special character (@ or #)")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// =====================================================
// PASSWORD RESET TOKEN OPERATIONS
// =====================================================

export interface PasswordResetToken {
  id: number
  user_id: number | null
  user_type: string
  otp: string
  otp_expires_at: string
  identity_field: string
  identity_value: string
  status: "pending" | "verified" | "used"
  created_at: string
  updated_at: string
}

/**
 * Create a new password reset token
 */
export async function createPasswordResetToken(
  userType: string,
  identityField: string,
  identityValue: string,
  userId?: number | null,
): Promise<PasswordResetToken> {
  const otp = generateOTP()
  const otpExpiresAt = calculateOTPExpiry()

  const result = await sql`
    INSERT INTO password_reset_tokens 
    (user_id, user_type, otp, otp_expires_at, identity_field, identity_value, status, created_at, updated_at)
    VALUES (${userId || null}, ${userType}, ${otp}, ${otpExpiresAt}, ${identityField}, ${identityValue}, 'pending', NOW(), NOW())
    RETURNING *
  `

  return result[0]
}

/**
 * Get a password reset token by OTP
 */
export async function getPasswordResetTokenByOTP(otp: string): Promise<PasswordResetToken | null> {
  const result = await sql`
    SELECT * FROM password_reset_tokens 
    WHERE otp = ${otp} AND status = 'pending' AND otp_expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `

  return result.length > 0 ? result[0] : null
}

/**
 * Get a password reset token by identity value and user type
 */
export async function getPasswordResetTokenByIdentity(
  userType: string,
  identityValue: string,
): Promise<PasswordResetToken | null> {
  const result = await sql`
    SELECT * FROM password_reset_tokens 
    WHERE user_type = ${userType} AND identity_value = ${identityValue} AND status = 'pending' AND otp_expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `

  return result.length > 0 ? result[0] : null
}

/**
 * Verify and mark OTP as verified
 */
export async function verifyPasswordResetOTP(tokenId: number): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE password_reset_tokens 
      SET status = 'verified', updated_at = NOW()
      WHERE id = ${tokenId} AND status = 'pending' AND otp_expires_at > NOW()
      RETURNING id
    `
    return result.length > 0
  } catch (error) {
    console.error("[Password Reset] Error verifying OTP:", error)
    return false
  }
}

/**
 * Mark token as used after password reset
 */
export async function markPasswordResetTokenAsUsed(tokenId: number): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE password_reset_tokens 
      SET status = 'used', updated_at = NOW()
      WHERE id = ${tokenId}
      RETURNING id
    `
    return result.length > 0
  } catch (error) {
    console.error("[Password Reset] Error marking token as used:", error)
    return false
  }
}

/**
 * Check if token has been verified
 */
export async function isPasswordResetTokenVerified(tokenId: number): Promise<boolean> {
  const result = await sql`SELECT status FROM password_reset_tokens WHERE id = ${tokenId}`

  return result.length > 0 && result[0].status === "verified"
}

/**
 * Clean up expired OTP tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM password_reset_tokens 
      WHERE otp_expires_at < NOW() AND status = 'pending'
    `
    return result.length || 0
  } catch (error) {
    console.error("[Password Reset] Failed to cleanup expired tokens:", error)
    return 0
  }
}

// =====================================================
// PASSWORD RESET ATTEMPT TRACKING
// =====================================================

/**
 * Log a password reset attempt
 */
export async function logPasswordResetAttempt(
  userType: string,
  identityValue: string,
  attemptType: "otp_request" | "otp_verify" | "password_reset",
  ipAddress: string | null = null,
  success: boolean = true,
): Promise<void> {
  try {
    await sql`
      INSERT INTO password_reset_attempts 
      (user_type, identity_value, ip_address, attempt_type, success, created_at)
      VALUES (${userType}, ${identityValue}, ${ipAddress || null}, ${attemptType}, ${success}, NOW())
    `
  } catch (error) {
    console.error("[Password Reset] Failed to log attempt:", error)
  }
}

/**
 * Get recent password reset attempts for rate limiting
 */
export async function getRecentPasswordResetAttempts(
  userType: string,
  identityValue: string,
  minutesBack: number = 60,
): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM password_reset_attempts 
      WHERE user_type = ${userType} AND identity_value = ${identityValue} 
      AND created_at > NOW() - INTERVAL '${minutesBack} minutes'
    `
    return parseInt(result[0].count || 0, 10)
  } catch (error) {
    console.error("[Password Reset] Failed to get attempts:", error)
    return 0
  }
}

/**
 * Get failed OTP verification attempts
 */
export async function getFailedOTPAttempts(
  userType: string,
  identityValue: string,
  minutesBack: number = 15,
): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM password_reset_attempts 
      WHERE user_type = ${userType} AND identity_value = ${identityValue} AND attempt_type = 'otp_verify' 
      AND success = false AND created_at > NOW() - INTERVAL '${minutesBack} minutes'
    `
    return parseInt(result[0].count || 0, 10)
  } catch (error) {
    console.error("[Password Reset] Failed to get failed OTP attempts:", error)
    return 0
  }
}

// =====================================================
// PASSWORD RESET AUDIT LOGGING
// =====================================================

/**
 * Log a password reset action for security audit
 */
export async function logPasswordResetAudit(
  userType: string,
  userId: number | null,
  identityValue: string,
  action: "otp_requested" | "otp_verified" | "password_reset" | "otp_expired",
  ipAddress: string | null = null,
  userAgent: string | null = null,
): Promise<void> {
  try {
    await sql`
      INSERT INTO password_reset_audit_log 
      (user_type, user_id, identity_value, action, ip_address, user_agent, created_at)
      VALUES (${userType}, ${userId || null}, ${identityValue}, ${action}, ${ipAddress || null}, ${userAgent || null}, NOW())
    `
  } catch (error) {
    console.error("[Password Reset] Failed to log audit:", error)
  }
}

// =====================================================
// PASSWORD RESET STATUS MANAGEMENT
// =====================================================

/**
 * Update user's password reset status
 */
export async function updatePasswordResetStatus(
  userType: string,
  userId: number,
  status: "none" | "recently_reset",
): Promise<boolean> {
  const tableMap: { [key: string]: string } = {
    student: "students",
    admin: "admins",
    tutor: "tutors",
    technical: "technical_team_users",
    administrative_personnel: "administrative_personnel",
    accounts_personnel: "accounts_personnel", // May need to adjust based on actual table name
    peon: "peon_housekeeping_users",
  }

  const tableName = tableMap[userType]
  if (!tableName) {
    console.error(`[Password Reset] Unknown user type: ${userType}`)
    return false
  }

  try {
    await sql.unsafe(`
      UPDATE ${tableName} 
      SET password_reset_status = $1, last_password_change_date = NOW()
      WHERE id = $2
      RETURNING id
    `, [status, userId])

    return true
  } catch (error) {
    console.error(`[Password Reset] Failed to update status for ${userType}:`, error)
    return false
  }
}

/**
 * Get user's password reset status
 */
export async function getPasswordResetStatus(userType: string, userId: number): Promise<string | null> {
  const tableMap: { [key: string]: string } = {
    student: "students",
    admin: "admins",
    tutor: "tutors",
    technical: "technical_team_users",
    administrative_personnel: "administrative_personnel",
    accounts_personnel: "accounts_personnel",
    peon: "peon_housekeeping_users",
  }

  const tableName = tableMap[userType]
  if (!tableName) {
    return null
  }

  try {
    const result = await sql.unsafe(`SELECT password_reset_status FROM ${tableName} WHERE id = $1`, [userId])

    return result.length > 0 ? result[0].password_reset_status : null
  } catch (error) {
    console.error(`[Password Reset] Failed to get status for ${userType}:`, error)
    return null
  }
}
