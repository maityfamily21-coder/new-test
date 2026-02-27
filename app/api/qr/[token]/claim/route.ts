import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { randomUUID } from "crypto"

let ddlEnsured = false
async function ensureDDL() {
  if (ddlEnsured) return
  await sql`
    CREATE TABLE IF NOT EXISTS seminar_qr_tokens (
      id SERIAL PRIMARY KEY,
      seminar_id INTEGER NOT NULL UNIQUE REFERENCES seminars(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_seminar_qr_tokens_token ON seminar_qr_tokens(token)`

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
  await sql`
    CREATE TABLE IF NOT EXISTS seminar_qr_sessions (
      id SERIAL PRIMARY KEY,
      seminar_id INTEGER NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    )
  `
  ddlEnsured = true
}

export async function POST(_request: Request, { params }: { params: { token: string } }) {
  try {
    await ensureDDL()
    const { token } = params

    const [row] = await sql`
      SELECT seminar_id, COALESCE(active, TRUE) AS active, created_at
      FROM seminar_qr_tokens
      WHERE token = ${token}
      LIMIT 1
    `
    if (!row) {
      return NextResponse.json({ success: false, message: "Invalid or expired QR. Please rescan." }, { status: 404 })
    }
    if (!row.active) {
      return NextResponse.json({ success: false, message: "Attendance Closed" }, { status: 403 })
    }

    const createdAt = new Date(row.created_at)
    const isFresh = createdAt && Date.now() - createdAt.getTime() <= 6000
    if (!isFresh) {
      return NextResponse.json({ success: false, message: "Invalid or expired QR. Please rescan." }, { status: 404 })
    }

    const seminarId = Number(row.seminar_id)
    const sessionId = randomUUID()
    // 20-second grace to complete the form
    await sql`
      INSERT INTO seminar_qr_sessions (seminar_id, session_id, expires_at)
      VALUES (${seminarId}, ${sessionId}, NOW() + INTERVAL '20 seconds')
    `
    const res = NextResponse.json({ success: true })
    res.cookies.set("qr_session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // was: true
      maxAge: 20,
      path: "/",
    })
    return res
  } catch (e) {
    console.error("[MYT] QR claim error:", e)
    return NextResponse.json({ success: false, message: "Failed to claim session" }, { status: 500 })
  }
}
