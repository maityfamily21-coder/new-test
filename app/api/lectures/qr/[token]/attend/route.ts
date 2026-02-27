import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { authenticateStudent } from "@/lib/auth"
import { randomUUID } from "crypto"

const sql = neon(process.env.DATABASE_URL!)

let qrDDLEnsured = false

async function ensureQrDDL() {
  if (qrDDLEnsured) return

  await sql`
    CREATE TABLE IF NOT EXISTS lecture_qr_tokens (
      id SERIAL PRIMARY KEY,
      lecture_id INTEGER NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deactivated_at TIMESTAMP NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_lecture_qr_tokens_token ON lecture_qr_tokens(token)`

  await sql`
    CREATE TABLE IF NOT EXISTS lecture_qr_submissions (
      id SERIAL PRIMARY KEY,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      device_fingerprint TEXT,
      device_key TEXT,
      device_group TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_device
      ON lecture_qr_submissions(lecture_id, device_id)
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_ip
      ON lecture_qr_submissions(lecture_id, ip_address)
      WHERE ip_address IS NOT NULL AND ip_address <> ''
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_fingerprint
      ON lecture_qr_submissions(lecture_id, device_fingerprint)
      WHERE device_fingerprint IS NOT NULL AND device_fingerprint <> ''
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_device_key
      ON lecture_qr_submissions(lecture_id, device_key)
      WHERE device_key IS NOT NULL AND device_key <> ''
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_lecture_qr_submissions_device_group
      ON lecture_qr_submissions(lecture_id, device_group)
      WHERE device_group IS NOT NULL AND device_group <> ''
  `

  await sql`
    CREATE TABLE IF NOT EXISTS lecture_qr_sessions (
      id SERIAL PRIMARY KEY,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_lecture_qr_sessions_lecture ON lecture_qr_sessions(lecture_id)`

  qrDDLEnsured = true
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params
    const { enrollmentNumber, password, fingerprint, deviceKey, deviceGroup } = await request.json()

    if (!enrollmentNumber || !password) {
      return NextResponse.json(
        { success: false, message: "Enrollment number and password are required" },
        { status: 400 },
      )
    }

    await ensureQrDDL()

    const cookieHeader = request.headers.get("cookie") || ""
    const deviceCookieMatch = cookieHeader.match(/(?:^|;\s*)lecture_qr_device_id=([^;]+)/)
    const deviceId = deviceCookieMatch?.[1] || ""
    const sessionMatch = cookieHeader.match(/(?:^|;\s*)lecture_qr_session_id=([^;]+)/)
    const sessionId = sessionMatch?.[1] || null

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ""
    const userAgent = request.headers.get("user-agent") || ""

    let hasValidSession = false
    let sessionLectureId: number | null = null
    if (sessionId) {
      const [sess] = await sql`
        SELECT lecture_id
        FROM lecture_qr_sessions
        WHERE session_id = ${sessionId}
          AND expires_at > NOW()
        LIMIT 1
      `
      if (sess) {
        hasValidSession = true
        sessionLectureId = Number(sess.lecture_id)
      }
    }

    // Lookup by token if present
    const [row] = await sql`
      SELECT lecture_id, COALESCE(active, TRUE) AS active, created_at
      FROM lecture_qr_tokens
      WHERE token = ${token}
      LIMIT 1
    `
    const tokenExists = !!row
    const createdAt = tokenExists ? new Date(row.created_at) : null
    const isFresh = createdAt ? Date.now() - createdAt.getTime() <= 4000 : false

    const lectureId = tokenExists ? Number(row.lecture_id) : sessionLectureId

    if (!lectureId) {
      return NextResponse.json({ success: false, message: "Invalid or expired QR. Please rescan." }, { status: 404 })
    }

    let isActive = true
    if (tokenExists) {
      isActive = !!row.active
    } else {
      const [activeRow] = await sql`
        SELECT COALESCE(active, TRUE) AS active
        FROM lecture_qr_tokens
        WHERE lecture_id = ${lectureId}
        LIMIT 1
      `
      isActive = activeRow ? !!activeRow.active : true
    }

    if (!isActive) {
      return NextResponse.json({ success: false, message: "Attendance Closed" }, { status: 403 })
    }

    if (!isFresh && !hasValidSession) {
      return NextResponse.json({ success: false, message: "Invalid or expired QR. Please rescan." }, { status: 404 })
    }

    // Normalize device identifiers
    const normalizedGroup = (deviceGroup || "").toString().trim().toLowerCase()
    const normalizedFp = (fingerprint || "").toString().trim().toLowerCase()
    const normalizedKey = (deviceKey || "").toString().trim()

    // Check device group (primary anti-misuse check)
    if (normalizedGroup) {
      const priorGroup = await sql`
        SELECT 1 FROM lecture_qr_submissions
        WHERE lecture_id = ${lectureId} AND device_group = ${normalizedGroup}
        LIMIT 1
      `
      if (priorGroup?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already recorded from this device." },
          { status: 409 },
        )
      }
    }

    // Check device key (persistent across restarts)
    if (normalizedKey) {
      const priorKey = await sql`
        SELECT 1 FROM lecture_qr_submissions
        WHERE lecture_id = ${lectureId} AND device_key = ${normalizedKey}
        LIMIT 1
      `
      if (priorKey?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already recorded from this device." },
          { status: 409 },
        )
      }
    }

    // Check device fingerprint (secondary)
    if (normalizedFp) {
      const priorFp = await sql`
        SELECT 1 FROM lecture_qr_submissions
        WHERE lecture_id = ${lectureId} AND device_fingerprint = ${normalizedFp}
        LIMIT 1
      `
      if (priorFp?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already recorded from this device." },
          { status: 409 },
        )
      }
    }

    // Check device ID (cookie-based)
    if (deviceId) {
      const priorDevice = await sql`
        SELECT 1 FROM lecture_qr_submissions
        WHERE lecture_id = ${lectureId} AND device_id = ${deviceId}
        LIMIT 1
      `
      if (priorDevice?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already recorded from this device." },
          { status: 409 },
        )
      }
    }

    // Check IP address
    if (ip) {
      const priorIp = await sql`
        SELECT 1 FROM lecture_qr_submissions
        WHERE lecture_id = ${lectureId} AND ip_address = ${ip}
        LIMIT 1
      `
      if (priorIp?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already recorded from this device." },
          { status: 409 },
        )
      }
    }

    // Authenticate student
    const student = await authenticateStudent(enrollmentNumber, password)
    if (!student) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    // Get lecture and verify student enrollment
    const lectureData = await sql`
      SELECT l.id, l.subject_id, s.course_id, s.semester
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      WHERE l.id = ${lectureId}
    `

    if (!lectureData || lectureData.length === 0) {
      return NextResponse.json({ success: false, message: "Lecture not found" }, { status: 404 })
    }

    const { course_id, semester } = lectureData[0]

    // Verify student belongs to this lecture's course and semester
    const studentEnrolled = await sql`
      SELECT id FROM students
      WHERE id = ${student.id} AND course_id = ${course_id} AND current_semester = ${semester}
      LIMIT 1
    `

    if (!studentEnrolled || studentEnrolled.length === 0) {
      return NextResponse.json(
        { success: false, message: "You are not enrolled for this lecture's course/semester." },
        { status: 403 },
      )
    }

    // Check if already marked (extra safety)
    const existing = await sql`
      SELECT id FROM lecture_attendance
      WHERE lecture_id = ${lectureId} AND student_id = ${student.id}
      LIMIT 1
    `

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "Attendance already marked from this device." },
        { status: 409 },
      )
    }

    // Mark attendance as Present
    const updated = await sql`
      INSERT INTO lecture_attendance (lecture_id, student_id, status)
      VALUES (${lectureId}, ${student.id}, 'Present')
      RETURNING id
    `

    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, message: "Failed to mark attendance" }, { status: 500 })
    }

    // Use persistent deviceKey for cookie if available
    let finalDeviceId = deviceId
    if (!finalDeviceId) {
      finalDeviceId = normalizedKey || randomUUID()
    }

    // Record device submission
    await sql`
      INSERT INTO lecture_qr_submissions (lecture_id, device_id, ip_address, user_agent, device_fingerprint, device_key, device_group)
      VALUES (${lectureId}, ${finalDeviceId || ""}, ${ip || ""}, ${userAgent || ""}, ${normalizedFp || ""}, ${normalizedKey || ""}, ${normalizedGroup || ""})
      ON CONFLICT DO NOTHING
    `

    const res = NextResponse.json({ success: true, message: "Attendance marked Present" })

    // Set persistent device cookie
    res.cookies.set("lecture_qr_device_id", finalDeviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    })

    if (sessionId) {
      res.cookies.set("lecture_qr_session_id", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 20,
        path: "/",
      })
    }

    return res
  } catch (error) {
    console.error("[MYT] Lecture QR attend error:", error)
    return NextResponse.json({ success: false, message: "Failed to mark attendance" }, { status: 500 })
  }
}
