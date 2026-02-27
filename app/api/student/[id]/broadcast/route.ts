import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // --- 1. NEW AUTH CHECK ---
    const cookieStore = cookies()
    const session = cookieStore.get("session") || cookieStore.get("token") || cookieStore.get("student_token")

    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    // -------------------------

    const broadcasts = await sql`
      SELECT * FROM broadcast_messages
      WHERE is_active = true
      ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, broadcasts })
  } catch (error) {
    console.error("Student broadcast fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch broadcasts" }, { status: 500 })
  }
}
