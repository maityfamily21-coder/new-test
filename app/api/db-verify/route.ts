import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Starting database verification...")
    
    const tables = [
      'lectures',
      'students',
      'tutors',
      'lecture_attendance',
      'lecture_qr_tokens',
      'lecture_qr_submissions',
      'courses',
      'subjects'
    ]
    
    const results: Record<string, any> = {}
    
    for (const table of tables) {
      try {
        const rows = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${table}
          ORDER BY ordinal_position
        `
        results[table] = {
          exists: true,
          columns: rows
        }
        console.log(`[v0] Table ${table} exists with ${rows.length} columns`)
      } catch (err: any) {
        results[table] = {
          exists: false,
          error: err?.message
        }
        console.log(`[v0] Table ${table} does not exist or error:`, err?.message)
      }
    }
    
    // Check for data
    try {
      const studentCount = await sql`SELECT COUNT(*) as count FROM students`
      const lectureCount = await sql`SELECT COUNT(*) as count FROM lectures`
      const attendanceCount = await sql`SELECT COUNT(*) as count FROM lecture_attendance`
      
      results.dataCount = {
        students: studentCount[0]?.count || 0,
        lectures: lectureCount[0]?.count || 0,
        attendance: attendanceCount[0]?.count || 0
      }
    } catch (err: any) {
      console.log("[v0] Error checking data counts:", err?.message)
      results.dataCount = { error: err?.message }
    }
    
    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      database: results
    })
  } catch (err: any) {
    console.error("[v0] Database verification error:", err?.message || err)
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}
