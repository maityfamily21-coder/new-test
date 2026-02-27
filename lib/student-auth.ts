export class StudentAuthManager {
  private static readonly AUTH_KEY = "studentAuth"
  private static readonly CREDENTIALS_KEY = "studentCredentials"

  /**
   * Convert string to base64 using modern browser APIs
   * Handles all UTF-8 characters properly - NO Node.js dependencies!
   */
  private static base64Encode(str: string): string {
    try {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(str)

      const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
      let result = ""

      for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i]
        const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0
        const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0

        const e1 = b1 >> 2
        const e2 = ((b1 & 3) << 4) | (b2 >> 4)
        const e3 = ((b2 & 15) << 2) | (b3 >> 6)
        const e4 = b3 & 63

        result += base64Chars[e1]
        result += base64Chars[e2]
        result += i + 1 < bytes.length ? base64Chars[e3] : "="
        result += i + 2 < bytes.length ? base64Chars[e4] : "="
      }

      return result
    } catch (error) {
      console.error("[v0] Base64 encoding failed:", error)
      return ""
    }
  }

  /**
   * Decode base64 string back to original string
   */
  private static base64Decode(encoded: string): string {
    try {
      const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
      const bytes: number[] = []

      const cleanEncoded = encoded.replace(/=/g, "")

      for (let i = 0; i < cleanEncoded.length; i += 4) {
        const i1 = base64Chars.indexOf(cleanEncoded[i])
        const i2 = i + 1 < cleanEncoded.length ? base64Chars.indexOf(cleanEncoded[i + 1]) : 0
        const i3 = i + 2 < cleanEncoded.length ? base64Chars.indexOf(cleanEncoded[i + 2]) : -1
        const i4 = i + 3 < cleanEncoded.length ? base64Chars.indexOf(cleanEncoded[i + 3]) : -1

        if (i1 === -1 || i2 === -1) break

        const byte1 = (i1 << 2) | (i2 >> 4)
        bytes.push(byte1)

        if (i3 !== -1) {
          const byte2 = ((i2 & 15) << 4) | (i3 >> 2)
          bytes.push(byte2)
        }

        if (i4 !== -1) {
          const byte3 = ((i3 & 3) << 6) | i4
          bytes.push(byte3)
        }
      }

      const decoder = new TextDecoder()
      return decoder.decode(new Uint8Array(bytes))
    } catch (error) {
      console.error("[v0] Base64 decoding failed:", error)
      return ""
    }
  }

  static setAuth(student: any, enrollment: string, password: string) {

    try {

      if (!student || !enrollment) {
        console.error("[v0] StudentAuthManager.setAuth: Missing student or enrollment")
        return
      }

      console.log("[v0] Saving fresh student auth")

      // ALWAYS store latest student from database
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(student))

      // Store credentials ONLY if password exists
      if (password && password.length > 0) {
        localStorage.setItem(
          this.CREDENTIALS_KEY,
          JSON.stringify({ enrollment, password })
        )

        const tokenData = `${enrollment}:${password}`
        const token = btoa(tokenData)
        localStorage.setItem("studentToken", token)
      }

      console.log("[v0] Student auth saved successfully")

    } catch (error) {
      console.error("[v0] StudentAuthManager.setAuth error:", error)
    }

  }

  static getAuth() {
    try {
      const studentData = localStorage.getItem(this.AUTH_KEY)
      const credentialsData = localStorage.getItem(this.CREDENTIALS_KEY)
      const token = localStorage.getItem("studentToken")

      if (!studentData || !credentialsData) return null

      return {
        student: JSON.parse(studentData),
        credentials: JSON.parse(credentialsData),
        token: token,
      }
    } catch (error) {
      console.error("[v0] Error getting auth:", error)
      return null
    }
  }

  static clearAuth() {
    localStorage.removeItem(this.AUTH_KEY)
    localStorage.removeItem(this.CREDENTIALS_KEY)
  }

  static getAuthHeaders() {
    try {
      const credentialsData = localStorage.getItem(this.CREDENTIALS_KEY)
      if (!credentialsData) {
        return {}
      }

      const { enrollment, password } = JSON.parse(credentialsData)

      if (!enrollment || !password) {
        return {}
      }

      const credentials = `${enrollment}:${password}`
      const encodedToken = this.base64Encode(credentials)

      if (!encodedToken) {
        return {}
      }

      return {
        Authorization: `Bearer ${encodedToken}`,
        "Content-Type": "application/json",
      }
    } catch (error) {
      console.error("[v0] Error creating auth headers:", error)
      return {}
    }
  }
}
