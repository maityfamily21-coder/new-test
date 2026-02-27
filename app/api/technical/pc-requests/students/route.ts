import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const examId = searchParams.get("examId")
    const subjectId = searchParams.get("subjectId")

    if (!examId || !subjectId) {
      return NextResponse.json({ success: false, message: "Missing examId or subjectId" }, { status: 400 })
    }

    // Fetch student details who requested PCs for this exam subject
    const students = await sql`
      SELECT 
        s.id as student_id,
        s.enrollment_number,
        s.full_name as name,
        pr.requested_at
      FROM pc_requests pr
      INNER JOIN students s ON pr.student_id = s.id
      WHERE pr.exam_id = ${Number.parseInt(examId)}
        AND pr.subject_id = ${Number.parseInt(subjectId)}
      ORDER BY pr.requested_at DESC
    `

    return NextResponse.json(
      { success: true, students },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching student details:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch student details",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
