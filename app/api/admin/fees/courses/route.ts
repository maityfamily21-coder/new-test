import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication
    const adminAuth = await validateAdminAuth(request)
    
    if (!adminAuth.success) {
      console.error("[v0] Unauthorized courses request:", adminAuth.error)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const courses = await sql`
      SELECT id, name, total_semesters
      FROM courses
      ORDER BY name
    `

    return NextResponse.json({ success: true, courses })
  } catch (error) {
    console.error("[v0] Fetch courses error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch courses" }, { status: 500 })
  }
}
