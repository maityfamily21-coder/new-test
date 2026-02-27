import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { randomUUID } from "crypto"

let qrDDLEnsured = false
async function ensureQrDDL() {
  if (qrDDLEnsured) return
  await sql`
    CREATE TABLE IF NOT EXISTS student_qr_tokens (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS student_qr_attendance (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      attendance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      device_fingerprint TEXT,
      device_key TEXT,
      device_group TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_student_qr_attendance_student_id ON student_qr_attendance(student_id)`
  qrDDLEnsured = true
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params
    const { fingerprint, deviceKey, deviceGroup } = await request.json()

    await ensureQrDDL()

    // Validate token
    const [row] = await sql`
      SELECT student_id FROM student_qr_tokens WHERE token = ${token} LIMIT 1
    `

    if (!row) {
      return NextResponse.json({ success: false, message: "Invalid QR code" }, { status: 404 })
    }

    const studentId = Number(row.student_id)
    const ip = request.ip || ""
    const userAgent = request.headers.get("user-agent") || ""

    // Normalize identifiers
    const normalizedGroup = (deviceGroup || "").toString().trim().toLowerCase()
    const normalizedFp = (fingerprint || "").toString().trim().toLowerCase()
    const normalizedKey = (deviceKey || "").toString().trim()

    // Check for duplicate attendance from same device
    if (normalizedGroup) {
      const prior = await sql`
        SELECT 1 FROM student_qr_attendance
        WHERE student_id = ${studentId} AND device_group = ${normalizedGroup}
        AND attendance_date > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `
      if (prior?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already marked from this device today." },
          { status: 409 },
        )
      }
    }

    if (normalizedKey) {
      const prior = await sql`
        SELECT 1 FROM student_qr_attendance
        WHERE student_id = ${studentId} AND device_key = ${normalizedKey}
        AND attendance_date > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `
      if (prior?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already marked from this device today." },
          { status: 409 },
        )
      }
    }

    // Record attendance
    await sql`
      INSERT INTO student_qr_attendance (student_id, device_fingerprint, device_key, device_group, ip_address, user_agent)
      VALUES (${studentId}, ${normalizedFp || ""}, ${normalizedKey || ""}, ${normalizedGroup || ""}, ${ip || ""}, ${userAgent || ""})
    `

    const res = NextResponse.json({ success: true, message: "Attendance marked successfully" })

    // Set persistent device cookie
    res.cookies.set("qr_device_id", normalizedKey || randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    })

    return res
  } catch (error) {
    console.error("[MYT] Student QR attend error:", error)
    return NextResponse.json({ success: false, message: "Failed to mark attendance" }, { status: 500 })
  }
}
