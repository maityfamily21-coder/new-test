import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"
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

  // Add active and deactivated_at if missing
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

  // Submissions table (idempotent)
  await sql`
    CREATE TABLE IF NOT EXISTS seminar_qr_submissions (
      id SERIAL PRIMARY KEY,
      seminar_id INTEGER NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
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
  qrDDLEnsured = true
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = Number.parseInt(params.id)
    if (Number.isNaN(seminarId)) {
      return NextResponse.json({ success: false, message: "Invalid seminar id" }, { status: 400 })
    }

    await ensureQrDDL()

    // Validate seminar exists
    const exists = await sql`SELECT 1 FROM seminars WHERE id = ${seminarId} LIMIT 1`
    if (!exists || exists.length === 0) {
      return NextResponse.json({ success: false, message: "Seminar not found" }, { status: 404 })
    }

    // Single upsert-returning to avoid race between insert/select
    const newToken = randomUUID()
    const [row] = await sql`
      INSERT INTO seminar_qr_tokens (seminar_id, token)
      VALUES (${seminarId}, ${newToken})
      ON CONFLICT (seminar_id)
      DO UPDATE SET token = ${newToken}, created_at = NOW()
      RETURNING token
    `
    const token = row.token as string

    // Build origin robustly using proxy headers, with URL fallback
    const proto = request.headers.get("x-forwarded-proto") || "https"
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
    const origin = host ? `${proto}://${host}` : new URL(request.url).origin
    const url = `${origin}/qr/${token}`

    return NextResponse.json({ success: true, token, url })
  } catch (error) {
    console.error("[MYT] QR token error:", error)
    return NextResponse.json({ success: false, message: "Failed to get QR code" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = Number.parseInt(params.id)
    if (Number.isNaN(seminarId)) {
      return NextResponse.json({ success: false, message: "Invalid seminar id" }, { status: 400 })
    }

    await ensureQrDDL()

    const body = await request.json().catch(() => ({}) as any)
    const active = typeof body?.active === "boolean" ? body.active : false

    // Ensure token row exists; do not regenerate token here
    const [row] = await sql`
      INSERT INTO seminar_qr_tokens (seminar_id, token)
      VALUES (${seminarId}, ${randomUUID()})
      ON CONFLICT (seminar_id) DO UPDATE SET seminar_id = EXCLUDED.seminar_id
      RETURNING id
    `

    // Toggle active state; set deactivated_at when closing
    if (!active) {
      await sql`
        UPDATE seminar_qr_tokens
        SET active = FALSE, deactivated_at = CURRENT_TIMESTAMP
        WHERE seminar_id = ${seminarId}
      `
    } else {
      await sql`
        UPDATE seminar_qr_tokens
        SET active = TRUE, deactivated_at = NULL
        WHERE seminar_id = ${seminarId}
      `
    }

    return NextResponse.json({ success: true, active })
  } catch (error) {
    console.error("[MYT] QR toggle error:", error)
    return NextResponse.json({ success: false, message: "Failed to update QR status" }, { status: 500 })
  }
}
