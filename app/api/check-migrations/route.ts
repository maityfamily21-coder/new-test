import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const tables = [
      "lectures",
      "students", 
      "subjects",
      "courses",
      "tutors",
      "lecture_qr_tokens",
      "lecture_qr_submissions",
      "lecture_attendance"
    ]

    const results: Record<string, any> = {}

    for (const tableName of tables) {
      try {
        const rows = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `
        results[tableName] = {
          exists: true,
          columns: rows.map((r: any) => `${r.column_name} (${r.data_type})`)
        }
      } catch (err: any) {
        results[tableName] = {
          exists: false,
          error: err?.message || "Table does not exist"
        }
      }
    }

    // Check for critical columns
    const criticalChecks = {
      "lecture_attendance.student_id": false,
      "lecture_attendance.lecture_id": false,
      "students.id": false,
      "lectures.id": false
    }

    // Verify lecture_attendance has student_id
    try {
      await sql`SELECT student_id FROM lecture_attendance LIMIT 1`
      criticalChecks["lecture_attendance.student_id"] = true
    } catch (err: any) {
      criticalChecks["lecture_attendance.student_id"] = false
    }

    // Verify lecture_attendance has lecture_id
    try {
      await sql`SELECT lecture_id FROM lecture_attendance LIMIT 1`
      criticalChecks["lecture_attendance.lecture_id"] = true
    } catch (err: any) {
      criticalChecks["lecture_attendance.lecture_id"] = false
    }

    return NextResponse.json({
      status: "ok",
      tables: results,
      criticalColumns: criticalChecks,
      nextStep: Object.values(results).every((t: any) => t.exists)
        ? "All tables exist! QR scanning should work."
        : "Run migrations at /setup-db to create missing tables"
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: "error", 
        error: error?.message || "Failed to check migrations"
      },
      { status: 500 }
    )
  }
}
