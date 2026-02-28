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
      try {
        const settingsResult = await sql`
          SELECT * FROM feedback_settings 
          ORDER BY created_at DESC 
          LIMIT 1
        `
        const settings = settingsResult.rows[0] || { is_active: false }
        return NextResponse.json({ success: true, settings })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, settings: { is_active: false } })
        }
        throw tableError
      }
    }

    if (action === "pending" && studentId) {
      // Get pending feedback subjects for student - all subjects with assigned tutors
      try {
        const pendingResult = await sql`
          SELECT DISTINCT 
            s.id,
            s.name,
            t.id as tutor_id,
            t.name as tutor_name
          FROM subjects s
          JOIN subject_tutors st ON s.id = st.subject_id
          JOIN tutors t ON st.tutor_id = t.id
          WHERE NOT EXISTS (
            SELECT 1 FROM tutor_feedback tf
            WHERE tf.student_id = ${studentId}
            AND tf.subject_id = s.id
            AND tf.tutor_id = t.id
          )
          ORDER BY s.name, t.name
        `
        console.log("[v0] Pending feedback found:", pendingResult.rows.length, "subjects")
        return NextResponse.json({ success: true, pending: pendingResult.rows })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, pending: [] })
        }
        throw tableError
      }
    }

    if (action === "submitted" && studentId) {
      // Get submitted feedback for student
      try {
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
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, submitted: [] })
        }
        throw tableError
      }
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
    try {
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
    } catch (tableError: any) {
      if (tableError.message?.includes("does not exist")) {
        return NextResponse.json(
          { success: false, error: "Feedback system not initialized" },
          { status: 503 }
        )
      }
      throw tableError
    }

    // Insert feedback
    try {
      const result = await sql`
        INSERT INTO tutor_feedback (student_id, tutor_id, subject_id, rating, comments)
        VALUES (${studentId}, ${tutorId}, ${subjectId}, ${rating}, ${comments || null})
        RETURNING *
      `

      return NextResponse.json({
        success: true,
        feedback: result.rows[0],
      })
    } catch (tableError: any) {
      if (tableError.message?.includes("does not exist")) {
        return NextResponse.json(
          { success: false, error: "Feedback system not initialized" },
          { status: 503 }
        )
      }
      // Handle duplicate feedback error
      if (tableError.message?.includes("duplicate") || tableError.message?.includes("Unique")) {
        return NextResponse.json(
          { success: false, error: "Feedback already submitted for this tutor-subject pair" },
          { status: 409 }
        )
      }
      throw tableError
    }
  } catch (error: any) {
    console.error("Feedback POST error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
