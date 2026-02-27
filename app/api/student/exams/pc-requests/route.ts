import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ success: false, message: "Student ID is required" }, { status: 400 })
    }

    const requests = await sql`
      SELECT exam_id, subject_id, requested_at
      FROM pc_requests
      WHERE student_id = ${studentId}
    `

    return NextResponse.json({
      success: true,
      requests,
    })
  } catch (error: any) {
    console.error("[MYT] Error fetching PC requests:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch PC requests",
      },
      { status: 500 },
    )
  }
}
