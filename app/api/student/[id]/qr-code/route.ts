import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { randomUUID } from "crypto"
import { cookies } from "next/headers"

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
  await sql`CREATE INDEX IF NOT EXISTS idx_student_qr_tokens_token ON student_qr_tokens(token)`
  await sql`CREATE INDEX IF NOT EXISTS idx_student_qr_tokens_student_id ON student_qr_tokens(student_id)`

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
  await sql`CREATE INDEX IF NOT EXISTS idx_student_qr_attendance_date ON student_qr_attendance(attendance_date)`
  qrDDLEnsured = true
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("session") || cookieStore.get("token") || cookieStore.get("student_token")

    if (!sessionCookie) {
      console.log("[v0] No session cookie found")
      return NextResponse.json({ success: false, message: "Unauthorized: Please login" }, { status: 401 })
    }

    let sessionData
    try {
      sessionData = JSON.parse(sessionCookie.value)
    } catch {
      console.log("[v0] Invalid session cookie format")
      return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 })
    }

    const authenticatedStudentId = sessionData.id
    const requestedStudentId = Number.parseInt(params.id)

    if (!authenticatedStudentId || authenticatedStudentId !== requestedStudentId) {
      console.log("[v0] Student ID mismatch:", { authenticatedStudentId, requestedStudentId })
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only access your own QR code" },
        { status: 403 },
      )
    }

    if (Number.isNaN(requestedStudentId)) {
      return NextResponse.json({ success: false, message: "Invalid student id" }, { status: 400 })
    }

    await ensureQrDDL()

    // Get student data
    const [student] = await sql`
      SELECT id, full_name, enrollment_number, course_id, current_semester
      FROM students
      WHERE id = ${requestedStudentId}
      LIMIT 1
    `

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    // Get or create QR token
    const [existing] = await sql`
      SELECT token FROM student_qr_tokens WHERE student_id = ${requestedStudentId} LIMIT 1
    `

    let token = existing?.token
    if (!token) {
      token = randomUUID()
      await sql`
        INSERT INTO student_qr_tokens (student_id, token)
        VALUES (${requestedStudentId}, ${token})
        ON CONFLICT (student_id) DO UPDATE SET token = EXCLUDED.token
      `
    }

    // Build QR URL
    const proto = request.headers.get("x-forwarded-proto") || "https"
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
    const origin = host ? `${proto}://${host}` : new URL(request.url).origin
    const qrUrl = `${origin}/student-qr/${token}`

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrUrl)}`

    // Prepare QR data (what will be encoded in the QR)
    const qrData = {
      studentId: student.id,
      name: student.full_name,
      enrollmentNumber: student.enrollment_number,
      course: student.course_id,
      semester: student.current_semester,
      token: token,
    }

    console.log("[v0] QR code generated successfully for student:", requestedStudentId)

    return NextResponse.json({
      success: true,
      token,
      qrUrl,
      qrImageUrl,
      qrData: JSON.stringify(qrData),
      student: {
        id: student.id,
        name: student.full_name,
        enrollmentNumber: student.enrollment_number,
      },
    })
  } catch (error) {
    console.error("[v0] Student QR code error:", error)
    return NextResponse.json({ success: false, message: "Failed to get QR code" }, { status: 500 })
  }
}
