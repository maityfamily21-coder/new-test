import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('lecture_qr_tokens', 'lecture_attendance', 'lectures', 'students')
    `

    const tokenCount = await sql`SELECT COUNT(*) as count FROM lecture_qr_tokens`
    const attendanceCount = await sql`SELECT COUNT(*) as count FROM lecture_attendance`
    const recentTokens = await sql`
      SELECT id, lecture_id, token, active, created_at 
      FROM lecture_qr_tokens 
      ORDER BY created_at DESC 
      LIMIT 5
    `

    return NextResponse.json(
      {
        status: "ok",
        tables: tables.map((t: any) => t.table_name),
        tokenCount: tokenCount[0]?.count || 0,
        attendanceCount: attendanceCount[0]?.count || 0,
        recentTokens: recentTokens,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[v0] Debug error:", error?.message || error)
    return NextResponse.json(
      {
        error: error?.message || "Error querying database",
        detail: JSON.stringify(error, null, 2),
      },
      { status: 500 }
    )
  }
}
