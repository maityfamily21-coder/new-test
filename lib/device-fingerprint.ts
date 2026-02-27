import crypto from "crypto"

export interface DeviceInfo {
  deviceId: string
  fingerprint: string
  userAgent: string
  platform: string
  language: string
  timezone: string
  screenResolution: string
  timestamp: number
}

/**
 * Generate a unique device fingerprint combining multiple browser properties
 * Used to prevent multiple attendance marks from different devices
 */
export function generateDeviceFingerprint(): DeviceInfo {
  const timestamp = Date.now()

  // In browser environment
  if (typeof window !== "undefined") {
    const navigator = window.navigator
    const screen = window.screen

    const fingerprint = {
      userAgent: navigator.userAgent,
      platform: navigator.platform || navigator.vendor || "",
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      timestamp,
    }

    const fingerprintString = JSON.stringify(fingerprint)
    const hash = crypto.createHash("sha256").update(fingerprintString).digest("hex")

    return {
      deviceId: hash.substring(0, 16),
      fingerprint: hash,
      userAgent: navigator.userAgent,
      platform: fingerprint.platform,
      language: fingerprint.language,
      timezone: fingerprint.timezone,
      screenResolution: fingerprint.screenResolution,
      timestamp,
    }
  }

  // Server-side fallback
  return {
    deviceId: crypto.randomBytes(8).toString("hex"),
    fingerprint: crypto.randomBytes(32).toString("hex"),
    userAgent: "server",
    platform: "server",
    language: "en",
    timezone: "UTC",
    screenResolution: "unknown",
    timestamp,
  }
}

/**
 * Hash a device fingerprint for secure storage
 */
export function hashDeviceFingerprint(fingerprint: string): string {
  return crypto.createHash("sha256").update(fingerprint).digest("hex")
}

/**
 * Generate a session-based device ID for temporary tracking
 * This combines fingerprint + session for enhanced security
 */
export function generateSessionDeviceId(fingerprint: string): string {
  const sessionId = crypto.randomBytes(16).toString("hex")
  const combined = `${fingerprint}:${sessionId}`
  return crypto.createHash("sha256").update(combined).digest("hex").substring(0, 20)
}

/**
 * Validate device fingerprint hasn't been tampered with
 */
export function validateDeviceFingerprint(
  storedHash: string,
  currentFingerprint: string
): boolean {
  const currentHash = hashDeviceFingerprint(currentFingerprint)
  return storedHash === currentHash
}
