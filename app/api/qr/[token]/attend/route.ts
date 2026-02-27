import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { authenticateStudent } from "@/lib/auth"
import { randomUUID } from "crypto"

let qrDDLEnsured = false
async function ensureQrDDL() {
  if (qrDDLEnsured) return
  await sql`
    CREATE TABLE IF NOT EXISTS seminar_qr_tokens (
      id SERIAL PRIMARY KEY,
      seminar_id INTEGER NOT NULL UNIQUE REFERENCES seminars(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_seminar_qr_tokens_token ON seminar_qr_tokens(token)`

  // Add active and deactivated_at columns if missing
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='seminar_qr_tokens' AND column_name='active'
      ) THEN
        ALTER TABLE seminar_qr_tokens ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='seminar_qr_tokens' AND column_name='deactivated_at'
      ) THEN
        ALTER TABLE seminar_qr_tokens ADD COLUMN deactivated_at TIMESTAMP NULL;
      END IF;
    END
    $$;
  `

  // Track submissions to enforce one device/IP per seminar
  await sql`
    CREATE TABLE IF NOT EXISTS seminar_qr_submissions (
      id SERIAL PRIMARY KEY,
      seminar_id INTEGER NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
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
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_submissions_seminar_device
      ON seminar_qr_submissions(seminar_id, device_id)
  `
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_submissions_seminar_ip
      ON seminar_qr_submissions(seminar_id, ip_address)
      WHERE ip_address IS NOT NULL AND ip_address <> ''
  `
  // Add device_fingerprint column + unique index per seminar
  await sql`ALTER TABLE seminar_qr_submissions ADD COLUMN IF NOT EXISTS device_fingerprint TEXT`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_submissions_seminar_fp
      ON seminar_qr_submissions(seminar_id, device_fingerprint)
      WHERE device_fingerprint IS NOT NULL AND device_fingerprint <> ''
  `

  // Add persistent device_key with unique per seminar
  await sql`ALTER TABLE seminar_qr_submissions ADD COLUMN IF NOT EXISTS device_key TEXT`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_submissions_seminar_device_key
      ON seminar_qr_submissions(seminar_id, device_key)
      WHERE device_key IS NOT NULL AND device_key <> ''
  `

  // Add device_group column + unique index to bind a physical device across profiles
  await sql`ALTER TABLE seminar_qr_submissions ADD COLUMN IF NOT EXISTS device_group TEXT`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_submissions_seminar_group
      ON seminar_qr_submissions(seminar_id, device_group)
      WHERE device_group IS NOT NULL AND device_group <> ''
  `

  await sql`
    CREATE TABLE IF NOT EXISTS seminar_qr_sessions (
      id SERIAL PRIMARY KEY,
      seminar_id INTEGER NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_qr_sessions_seminar ON seminar_qr_sessions(seminar_id)`
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
    const deviceCookieMatch = cookieHeader.match(/(?:^|;\s*)qr_device_id=([^;]+)/)
    const deviceId = deviceCookieMatch?.[1] || ""
    const sessionMatch = cookieHeader.match(/(?:^|;\s*)qr_session_id=([^;]+)/)
    const sessionId = sessionMatch?.[1] || null

    const ip = request.ip // Declare ip variable
    const userAgent = request.headers.get("user-agent") // Declare userAgent variable

    let hasValidSession = false
    let sessionSeminarId: number | null = null
    if (sessionId) {
      const [sess] = await sql`
        SELECT seminar_id
        FROM seminar_qr_sessions
        WHERE session_id = ${sessionId}
          AND expires_at > NOW()
        LIMIT 1
      `
      if (sess) {
        hasValidSession = true
        sessionSeminarId = Number(sess.seminar_id)
      }
    }

    // Lookup by token if present - may be stale or rotated away
    const [row] = await sql`
      SELECT seminar_id, COALESCE(active, TRUE) AS active, created_at
      FROM seminar_qr_tokens
      WHERE token = ${token}
      LIMIT 1
    `
    const tokenExists = !!row
    const createdAt = tokenExists ? new Date(row.created_at) : null
    const isFresh = createdAt ? Date.now() - createdAt.getTime() <= 6000 : false

    const seminarId = tokenExists ? Number(row.seminar_id) : sessionSeminarId

    if (!seminarId) {
      // Neither a fresh token nor a valid session could resolve seminar
      return NextResponse.json({ success: false, message: "Invalid or expired QR. Please rescan." }, { status: 404 })
    }

    let isActive = true
    if (tokenExists) {
      isActive = !!row.active
    } else {
      // Token rotated; fetch current active flag by seminar_id
      const [activeRow] = await sql`
        SELECT COALESCE(active, TRUE) AS active
        FROM seminar_qr_tokens
        WHERE seminar_id = ${seminarId}
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

    // Normalize incoming identifiers for consistent matching across profiles
    const normalizedGroup = (deviceGroup || "").toString().trim().toLowerCase()
    const normalizedFp = (fingerprint || "").toString().trim().toLowerCase()
    const normalizedKey = (deviceKey || "").toString().trim()

    if (normalizedGroup) {
      const priorGroup = await sql`
        SELECT 1 FROM seminar_qr_submissions
        WHERE seminar_id = ${seminarId} AND device_group = ${normalizedGroup}
        LIMIT 1
      `
      if (priorGroup?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already marked from this device." },
          { status: 409 },
        )
      }
    }

    // Enforce one submission per device_key (persistent across restarts for same profile)
    if (normalizedKey) {
      const priorKey = await sql`
        SELECT 1 FROM seminar_qr_submissions
        WHERE seminar_id = ${seminarId} AND device_key = ${normalizedKey}
        LIMIT 1
      `
      if (priorKey?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already marked from this device." },
          { status: 409 },
        )
      }
    }

    // Enforce one submission per device fingerprint (secondary)
    if (normalizedFp) {
      const priorFp = await sql`
        SELECT 1 FROM seminar_qr_submissions
        WHERE seminar_id = ${seminarId} AND device_fingerprint = ${normalizedFp}
        LIMIT 1
      `
      if (priorFp?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already marked from this device." },
          { status: 409 },
        )
      }
    }

    // Enforce one submission per device/IP per seminar (cookie-based and IP)
    if (deviceId) {
      const priorDevice = await sql`
        SELECT 1 FROM seminar_qr_submissions
        WHERE seminar_id = ${seminarId} AND device_id = ${deviceId}
        LIMIT 1
      `
      if (priorDevice?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already marked from this device." },
          { status: 409 },
        )
      }
    }

    if (ip) {
      const priorIp = await sql`
        SELECT 1 FROM seminar_qr_submissions
        WHERE seminar_id = ${seminarId} AND ip_address = ${ip}
        LIMIT 1
      `
      if (priorIp?.length) {
        return NextResponse.json(
          { success: false, message: "Attendance already marked from this device." },
          { status: 409 },
        )
      }
    }

    // Authenticate student
    const student = await authenticateStudent(enrollmentNumber, password)
    if (!student) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    // Ensure student was pre-enrolled for this seminar
    const preEnrolled = await sql`
      SELECT 1
      FROM seminar_attendance
      WHERE seminar_id = ${seminarId} AND student_id = ${student.id}
      LIMIT 1
    `
    if (!preEnrolled || preEnrolled.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not enrolled for this seminar. Please contact your coordinator if this is an error.",
        },
        { status: 403 },
      )
    }

    // Mark attendance as Present
    const updated = await sql`
      UPDATE seminar_attendance
      SET status = 'Present'
      WHERE seminar_id = ${seminarId} AND student_id = ${student.id}
      RETURNING 1
    `
    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, message: "Failed to update attendance" }, { status: 500 })
    }

    // Prefer persistent deviceKey; if cookie missing, derive cookie deviceId from deviceKey
    let finalDeviceId = deviceId
    if (!finalDeviceId) {
      finalDeviceId = normalizedKey || randomUUID()
    }

    // Store normalized device identifiers to keep consistent matching across profiles
    await sql`
      INSERT INTO seminar_qr_submissions (seminar_id, device_id, ip_address, user_agent, device_fingerprint, device_key, device_group)
      VALUES (${seminarId}, ${finalDeviceId || ""}, ${ip || ""}, ${userAgent || ""}, ${normalizedFp || ""}, ${normalizedKey || ""}, ${normalizedGroup || ""})
      ON CONFLICT DO NOTHING
    `

    const res = NextResponse.json({ success: true, message: "Attendance marked Present" })

    // Keep cookie in sync with deviceKey so it persists across sessions/restarts
    res.cookies.set("qr_device_id", finalDeviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    })

    if (sessionId) {
      // keep session cookie alive until the 20s window ends (server still enforces DB expires_at)
      res.cookies.set("qr_session_id", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 20,
        path: "/",
      })
    }

    return res
  } catch (error) {
    console.error("[MYT] QR attend error:", error)
    return NextResponse.json({ success: false, message: "Failed to mark attendance" }, { status: 500 })
  }
}
