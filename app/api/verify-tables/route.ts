import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Checking required tables...")
    
    const tables = [
      "lecture_qr_tokens",
      "lecture_qr_submissions", 
      "lecture_qr_sessions",
      "lecture_attendance",
      "lectures",
      "students",
      "subjects",
      "courses"
    ]
    
    const results: Record<string, boolean> = {}
    
    for (const table of tables) {
      try {
        const result = await sql`
          SELECT to_regclass('${sql.__proto__.constructor.name === 'Function' ? table : table}') IS NOT NULL as exists
        `
        // Fallback check
        try {
          await sql`SELECT 1 FROM ${table} LIMIT 1`
          results[table] = true
        } catch {
          results[table] = false
        }
      } catch (err: any) {
        results[table] = false
      }
    }
    
    const allTablesExist = Object.values(results).every(v => v === true)
    const missingTables = Object.entries(results)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table)
    
    console.log("[v0] Table check results:", results)
    
    return NextResponse.json({
      success: allTablesExist,
      tables: results,
      missingTables,
      message: allTablesExist 
        ? "All required tables exist! QR attendance should work." 
        : `Missing tables: ${missingTables.join(", ")}. Please run migrations at /setup-db`
    })
  } catch (err: any) {
    console.error("[v0] Verification error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    )
  }
}
