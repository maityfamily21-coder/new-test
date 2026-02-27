import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { randomUUID } from "crypto"
import QRCode from "qrcode"

const sql = neon(process.env.DATABASE_URL!)

let qrDDLEnsured = false

async function ensureQrDDL() {
  if (qrDDLEnsured) return

  // Create lecture QR tokens table
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
  await sql`CREATE INDEX IF NOT EXISTS idx_lecture_qr_tokens_lecture ON lecture_qr_tokens(lecture_id)`

  // Create submissions table
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

  // Create sessions table
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

export async function GET(request: NextRequest, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)
    if (Number.isNaN(lectureId)) {
      return NextResponse.json({ success: false, error: "Invalid lecture id" }, { status: 400 })
    }

    await ensureQrDDL()

    // Validate lecture exists
    const exists = await sql`SELECT 1 FROM lectures WHERE id = ${lectureId} LIMIT 1`
    if (!exists || exists.length === 0) {
      return NextResponse.json({ success: false, error: "Lecture not found" }, { status: 404 })
    }

    // Upsert QR token with fresh timestamp
    const newToken = randomUUID()
    const [row] = await sql`
      INSERT INTO lecture_qr_tokens (lecture_id, token)
      VALUES (${lectureId}, ${newToken})
      ON CONFLICT (lecture_id)
      DO UPDATE SET token = ${newToken}, created_at = NOW()
      RETURNING token
    `
    const token = row.token as string

    // Build origin robustly using proxy headers
    const proto = request.headers.get("x-forwarded-proto") || "https"
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
    const origin = host ? `${proto}://${host}` : new URL(request.url).origin
    const url = `${origin}/lectures/qr/${token}/attend`

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    return NextResponse.json({ success: true, token, url, qrCode })
  } catch (error) {
    console.error("[MYT] Lecture QR token error:", error)
    return NextResponse.json({ success: false, error: "Failed to get QR code" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { lectureId: string } }) {
  try {
    const lectureId = Number.parseInt(params.lectureId)
    if (Number.isNaN(lectureId)) {
      return NextResponse.json({ success: false, message: "Invalid lecture id" }, { status: 400 })
    }

    await ensureQrDDL()

    const body = await request.json().catch(() => ({}) as any)
    const active = typeof body?.active === "boolean" ? body.active : false

    // Ensure token row exists
    await sql`
      INSERT INTO lecture_qr_tokens (lecture_id, token)
      VALUES (${lectureId}, ${randomUUID()})
      ON CONFLICT (lecture_id) DO UPDATE SET lecture_id = EXCLUDED.lecture_id
    `

    // Toggle active state
    if (!active) {
      await sql`
        UPDATE lecture_qr_tokens
        SET active = FALSE, deactivated_at = CURRENT_TIMESTAMP
        WHERE lecture_id = ${lectureId}
      `
    } else {
      await sql`
        UPDATE lecture_qr_tokens
        SET active = TRUE, deactivated_at = NULL
        WHERE lecture_id = ${lectureId}
      `
    }

    return NextResponse.json({ success: true, active })
  } catch (error) {
    console.error("[MYT] Lecture QR toggle error:", error)
    return NextResponse.json({ success: false, message: "Failed to update QR status" }, { status: 500 })
  }
}
