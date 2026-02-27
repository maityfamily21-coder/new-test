import { createHmac, randomBytes, scryptSync } from "crypto"

// =====================================================
// TOKEN SIGNING & VERIFICATION (Tamper-Proof Tokens)
// =====================================================

const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key-change-in-production"
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export interface SessionPayload {
  userId: number
  role: "super_admin" | "course_admin" | "admin" | "student" | "tutor" | "technical" | "peon" | "personnel"
  permissions: string[]
  iat: number // issued at
  exp: number // expiry
}

/**
 * Create a cryptographically signed session token
 */
export function createSignedToken(payload: Omit<SessionPayload, "iat" | "exp">): string {
  const now = Date.now()
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  }

  const payloadString = JSON.stringify(fullPayload)
  const payloadBase64 = Buffer.from(payloadString).toString("base64url")

  // Create HMAC signature
  const signature = createHmac("sha256", SECRET_KEY).update(payloadBase64).digest("base64url")

  return `${payloadBase64}.${signature}`
}

/**
 * Verify and decode a signed token
 */
export function verifySignedToken(token: string): SessionPayload | null {
  try {
    const [payloadBase64, signature] = token.split(".")

    if (!payloadBase64 || !signature) {
      return null
    }

    // Verify signature
    const expectedSignature = createHmac("sha256", SECRET_KEY).update(payloadBase64).digest("base64url")

    if (signature !== expectedSignature) {
      console.log("[Security] Token signature verification failed")
      return null
    }

    // Decode payload
    const payloadString = Buffer.from(payloadBase64, "base64url").toString("utf-8")
    const payload = JSON.parse(payloadString) as SessionPayload

    // Check expiry
    if (Date.now() > payload.exp) {
      console.log("[Security] Token expired")
      return null
    }

    return payload
  } catch (error) {
    console.error("[Security] Token verification error:", error)
    return null
  }
}

// =====================================================
// PASSWORD HASHING (Scrypt)
// =====================================================

const SALT_LENGTH = 16
const KEY_LENGTH = 64

/**
 * Hash a password using scrypt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString("hex")
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex")
  return `${salt}:${hash}`
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":")
    const hashToVerify = scryptSync(password, salt, KEY_LENGTH).toString("hex")
    return hash === hashToVerify
  } catch (error) {
    console.error("[Security] Password verification error:", error)
    return false
  }
}

// =====================================================
// INPUT VALIDATION & SANITIZATION
// =====================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return ""

  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers like onclick=
    .trim()
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { isValid: boolean; sanitizedValue: string; errors: string[] } {
  const errors: string[] = []
  const sanitizedEmail = sanitizeString(email).toLowerCase()

  if (!sanitizedEmail) {
    errors.push("Email is required")
    return { isValid: false, sanitizedValue: "", errors }
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(sanitizedEmail)) {
    errors.push("Invalid email format")
  }

  if (sanitizedEmail.length > 255) {
    errors.push("Email is too long")
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedEmail,
    errors,
  }
}

/**
 * Validate and sanitize phone number
 */
export function validatePhone(phone: string): { isValid: boolean; sanitizedValue: string; errors: string[] } {
  const errors: string[] = []
  const sanitizedPhone = phone.replace(/[^\d+\-\s()]/g, "").trim()

  if (!sanitizedPhone) {
    errors.push("Phone number is required")
    return { isValid: false, sanitizedValue: "", errors }
  }

  const phoneRegex = /^[\d+\-\s()]{10,20}$/
  if (!phoneRegex.test(sanitizedPhone)) {
    errors.push("Invalid phone number format")
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedPhone,
    errors,
  }
}

/**
 * Validate username
 */
export function validateUsername(username: string): { isValid: boolean; sanitizedValue: string; errors: string[] } {
  const errors: string[] = []
  const sanitizedUsername = sanitizeString(username)

  if (!sanitizedUsername) {
    errors.push("Username is required")
    return { isValid: false, sanitizedValue: "", errors }
  }

  if (sanitizedUsername.length < 3) {
    errors.push("Username must be at least 3 characters")
  }

  if (sanitizedUsername.length > 50) {
    errors.push("Username is too long")
  }

  const usernameRegex = /^[a-zA-Z0-9_.-]+$/
  if (!usernameRegex.test(sanitizedUsername)) {
    errors.push("Username can only contain letters, numbers, dots, hyphens, and underscores")
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedUsername,
    errors,
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!password) {
    errors.push("Password is required")
    return { isValid: false, errors }
  }

  if (password.length < 6) {
    errors.push("Password must be at least 6 characters")
  }

  if (password.length > 128) {
    errors.push("Password is too long")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate enrollment number
 */
export function validateEnrollmentNumber(enrollment: string): {
  isValid: boolean
  sanitizedValue: string
  errors: string[]
} {
  const errors: string[] = []
  const sanitizedEnrollment = sanitizeString(enrollment).toUpperCase()

  if (!sanitizedEnrollment) {
    errors.push("Enrollment number is required")
    return { isValid: false, sanitizedValue: "", errors }
  }

  if (sanitizedEnrollment.length > 50) {
    errors.push("Enrollment number is too long")
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedEnrollment,
    errors,
  }
}

/**
 * Sanitize general text input
 */
export function sanitizeText(text: string, maxLength = 1000): string {
  if (typeof text !== "string") return ""

  return sanitizeString(text).substring(0, maxLength)
}

/**
 * Validate and sanitize integer input
 */
export function validateInteger(value: any, min?: number, max?: number): { isValid: boolean; value: number } {
  const num = Number.parseInt(value)

  if (!Number.isFinite(num)) {
    return { isValid: false, value: 0 }
  }

  if (min !== undefined && num < min) {
    return { isValid: false, value: num }
  }

  if (max !== undefined && num > max) {
    return { isValid: false, value: num }
  }

  return { isValid: true, value: num }
}

// =====================================================
// RATE LIMITING (In-Memory)
// =====================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check rate limit for a given key
 * @param key Unique identifier (e.g., "login:student:IP_ADDRESS")
 * @param maxAttempts Maximum number of attempts allowed
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k)
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    // Create new entry
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs }
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Reset rate limit for a key (e.g., after successful action)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key)
}

// =====================================================
// SQL INJECTION PREVENTION HELPERS
// =====================================================

/**
 * Validate array of integers (for SQL IN clauses)
 */
export function validateIntegerArray(values: any[]): number[] {
  if (!Array.isArray(values)) return []

  return values.map((v) => Number.parseInt(v)).filter((v) => Number.isFinite(v) && v > 0)
}

/**
 * Safe search query builder - returns parameterized conditions
 */
export function buildSafeSearchCondition(
  searchTerm: string,
  fields: string[],
): {
  condition: string
  param: string
} {
  const sanitized = sanitizeString(searchTerm)
  if (!sanitized || fields.length === 0) {
    return { condition: "", param: "" }
  }

  const searchPattern = `%${sanitized}%`
  const conditions = fields.map((field) => `${field} ILIKE $1`).join(" OR ")

  return {
    condition: `(${conditions})`,
    param: searchPattern,
  }
}
