import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch feedback settings and student pending feedback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const action = searchParams.get("action")

    if (action === "settings") {
      // Get feedback settings
      const settingsResult = await sql`
        SELECT * FROM feedback_settings 
        ORDER BY created_at DESC 
        LIMIT 1
      `
      const settings = settingsResult.rows[0] || { is_active: false }
      return NextResponse.json({ success: true, settings })
    }

    if (action === "pending" && studentId) {
      // Get pending feedback subjects for student
      const pendingResult = await sql`
        SELECT DISTINCT 
          s.id,
          s.name,
          t.id as tutor_id,
          t.name as tutor_name
        FROM subjects s
        JOIN enrollments e ON s.id = e.subject_id
        JOIN subject_tutors st ON s.id = st.subject_id
        JOIN tutors t ON st.tutor_id = t.id
        WHERE e.student_id = ${studentId}
        AND NOT EXISTS (
          SELECT 1 FROM tutor_feedback tf
          WHERE tf.student_id = ${studentId}
          AND tf.subject_id = s.id
          AND tf.tutor_id = t.id
        )
      `
      return NextResponse.json({ success: true, pending: pendingResult.rows })
    }

    if (action === "submitted" && studentId) {
      // Get submitted feedback for student
      const submittedResult = await sql`
        SELECT 
          tf.id,
          tf.rating,
          tf.comments,
          s.name as subject_name,
          t.name as tutor_name,
          tf.submitted_at
        FROM tutor_feedback tf
        JOIN subjects s ON tf.subject_id = s.id
        JOIN tutors t ON tf.tutor_id = t.id
        WHERE tf.student_id = ${studentId}
        ORDER BY tf.submitted_at DESC
      `
      return NextResponse.json({ success: true, submitted: submittedResult.rows })
    }

    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Feedback GET error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// POST - Submit feedback
export async function POST(request: NextRequest) {
  try {
    const { studentId, tutorId, subjectId, rating, comments } = await request.json()

    // Validate input
    if (!studentId || !tutorId || !subjectId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      )
    }

    // Check if feedback period is active
    const settingsResult = await sql`
      SELECT is_active FROM feedback_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    const settings = settingsResult.rows[0]
    if (!settings?.is_active) {
      return NextResponse.json(
        { success: false, error: "Feedback period is not active" },
        { status: 403 }
      )
    }

    // Insert feedback
    const result = await sql`
      INSERT INTO tutor_feedback (student_id, tutor_id, subject_id, rating, comments)
      VALUES (${studentId}, ${tutorId}, ${subjectId}, ${rating}, ${comments || null})
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      feedback: result.rows[0],
    })
  } catch (error: any) {
    // Handle duplicate feedback error
    if (error.message?.includes("duplicate") || error.message?.includes("Unique")) {
      return NextResponse.json(
        { success: false, error: "Feedback already submitted for this tutor-subject pair" },
        { status: 409 }
      )
    }
    console.error("Feedback POST error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
