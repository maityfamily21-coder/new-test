import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { studentId, examId, subjectId } = await request.json()

    console.log("[MYT] PC Request - Received data:", { studentId, examId, subjectId })

    if (!studentId || !examId || !subjectId) {
      return NextResponse.json(
        { success: false, message: "Student ID, Exam ID, and Subject ID are required" },
        { status: 400 },
      )
    }

    try {
      // Check if request already exists
      const existing = await sql`
        SELECT id FROM pc_requests
        WHERE exam_id = ${examId} AND subject_id = ${subjectId} AND student_id = ${studentId}
      `

      console.log("[MYT] Existing requests found:", existing.length)

      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, message: "PC request already submitted for this exam subject" },
          { status: 409 },
        )
      }

      // Insert PC request
      const result = await sql`
        INSERT INTO pc_requests (exam_id, subject_id, student_id)
        VALUES (${examId}, ${subjectId}, ${studentId})
        RETURNING id
      `

      console.log("[MYT] PC request created with ID:", result[0]?.id)

      return NextResponse.json({
        success: true,
        message: "PC request submitted successfully",
        requestId: result[0]?.id,
      })
    } catch (dbError: any) {
      console.error("[MYT] Database error:", dbError)

      // Check if it's a table doesn't exist error
      if (dbError.message && dbError.message.includes('relation "pc_requests" does not exist')) {
        return NextResponse.json(
          {
            success: false,
            message: "System not configured. Please contact administrator to run database migration script 29.",
          },
          { status: 500 },
        )
      }

      // Check if it's a foreign key constraint error
      if (dbError.message && (dbError.message.includes("foreign key") || dbError.message.includes("violates"))) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid exam, subject, or student reference. Please refresh and try again.",
          },
          { status: 400 },
        )
      }

      throw dbError
    }
  } catch (error: any) {
    console.error("[MYT] Error raising PC request:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to submit PC request",
      },
      { status: 500 },
    )
  }
}
