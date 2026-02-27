import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] QR init endpoint called")

    // Check if required tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('lecture_qr_tokens', 'lecture_attendance', 'lectures', 'students', 'subjects', 'courses')
    `

    console.log("[v0] Existing tables:", tables)

    // Try to create lecture_qr_tokens
    try {
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
      console.log("[v0] lecture_qr_tokens table ready")
    } catch (err: any) {
      console.error("[v0] Error creating lecture_qr_tokens:", err?.message)
    }

    // Try to create lecture_attendance
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS lecture_attendance (
          id SERIAL PRIMARY KEY,
          lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'Present',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(lecture_id, student_id)
        )
      `
      console.log("[v0] lecture_attendance table ready")
    } catch (err: any) {
      console.error("[v0] Error creating lecture_attendance:", err?.message)
    }

    // Check lecture_attendance columns
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lecture_attendance'
      ORDER BY ordinal_position
    `

    console.log("[v0] lecture_attendance columns:", columns)

    return NextResponse.json(
      {
        success: true,
        message: "QR system initialized",
        existingTables: tables.map((t: any) => t.table_name),
        lectureAttendanceColumns: columns.map((c: any) => ({
          name: c.column_name,
          type: c.data_type
        }))
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[v0] QR init error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
        details: JSON.stringify(error)
      },
      { status: 500 }
    )
  }
}
