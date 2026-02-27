import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending" // pending|sent|failed
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(10, Number.parseInt(searchParams.get("limit") || "10", 10)))
    const offset = (page - 1) * limit

    const [{ pending }] = await sql`SELECT COUNT(*)::int AS pending FROM email_queue WHERE status='pending'`
    const [{ sent }] = await sql`SELECT COUNT(*)::int AS sent FROM email_queue WHERE status='sent'`
    const [{ failed }] = await sql`SELECT COUNT(*)::int AS failed FROM email_queue WHERE status='failed'`

    const totalRes = await sql`SELECT COUNT(*)::int AS count FROM email_queue WHERE status=${status}`
    const total = totalRes[0]?.count || 0

    const items = await sql`
      SELECT id, recipient_email, subject, type, status, attempts, last_error, created_at, updated_at
      FROM email_queue
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return NextResponse.json({
      success: true,
      items,
      counts: { pending, sent, failed },
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    console.error("[mail-queue] list error:", error)
    return NextResponse.json({ success: false, message: "Failed to load mail queue" }, { status: 500 })
  }
}
