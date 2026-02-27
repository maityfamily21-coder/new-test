import { sql } from "@vercel/postgres"
import { NextRequest, NextResponse } from "next/server"

// GET - Fetch feedback analytics and data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const attendanceThreshold = parseInt(searchParams.get("attendanceThreshold") || "0")

    if (action === "summary") {
      // Overall feedback summary
      const summaryResult = await sql`
        SELECT 
          (SELECT COUNT(DISTINCT id) FROM students WHERE is_active = true) as total_eligible_students,
          (SELECT COUNT(DISTINCT student_id) FROM tutor_feedback) as total_submitted,
          (SELECT COUNT(DISTINCT id) FROM tutor_feedback) as total_feedback_count,
          ROUND((SELECT COUNT(DISTINCT student_id) FROM tutor_feedback)::numeric / 
                (SELECT COUNT(DISTINCT id) FROM students WHERE is_active = true) * 100, 2) as completion_percentage,
          (SELECT AVG(rating) FROM tutor_feedback) as overall_avg_rating
      `
      return NextResponse.json({ success: true, summary: summaryResult.rows[0] })
    }

    if (action === "tutorwise") {
      // Tutor-wise breakdown with attendance filter
      const tutorWiseResult = await sql`
        SELECT 
          t.id,
          t.name,
          s.name as subject_name,
          COUNT(DISTINCT tf.student_id) as feedback_count,
          ROUND(AVG(tf.rating)::numeric, 2) as average_rating,
          COUNT(DISTINCT CASE WHEN tf.rating >= 4 THEN tf.student_id END) as positive_count
        FROM tutors t
        JOIN subject_tutors st ON t.id = st.tutor_id
        JOIN subjects s ON st.subject_id = s.id
        LEFT JOIN tutor_feedback tf ON t.id = tf.tutor_id AND s.id = tf.subject_id
        GROUP BY t.id, t.name, s.name
        ORDER BY t.name, s.name
      `
      return NextResponse.json({ success: true, tutorwise: tutorWiseResult.rows })
    }

    if (action === "studentwise") {
      // Student-wise tracking
      const studentWiseResult = await sql`
        SELECT 
          st.id,
          st.name,
          st.enrollment_number,
          COUNT(DISTINCT tf.id) as submitted_count,
          (SELECT COUNT(DISTINCT s.id) FROM subjects s 
           JOIN enrollments e ON s.id = e.subject_id
           WHERE e.student_id = st.id) as eligible_count,
          ARRAY_AGG(DISTINCT CASE WHEN tf.id IS NULL THEN s.name END) FILTER (WHERE tf.id IS NULL) as pending_subjects
        FROM students st
        LEFT JOIN enrollments e ON st.id = e.student_id
        LEFT JOIN subjects s ON e.subject_id = s.id
        LEFT JOIN tutor_feedback tf ON st.id = tf.student_id AND s.id = tf.subject_id
        WHERE st.is_active = true
        GROUP BY st.id, st.name, st.enrollment_number
        ORDER BY st.name
      `
      return NextResponse.json({ success: true, studentwise: studentWiseResult.rows })
    }

    if (action === "withattendance") {
      // Get feedback with attendance filtering
      const feedbackWithAttendance = await sql`
        SELECT 
          st.id,
          st.name,
          st.enrollment_number,
          ROUND((COUNT(DISTINCT al.id)::numeric / COUNT(DISTINCT l.id)) * 100, 2) as attendance_percentage,
          COUNT(DISTINCT tf.id) as submitted_count,
          ARRAY_AGG(DISTINCT t.name) FILTER (WHERE tf.id IS NOT NULL) as tutors_rated
        FROM students st
        LEFT JOIN enrollments e ON st.id = e.student_id
        LEFT JOIN lectures l ON e.subject_id = l.subject_id
        LEFT JOIN attendance_logs al ON st.id = al.student_id AND l.id = al.lecture_id
        LEFT JOIN tutor_feedback tf ON st.id = tf.student_id
        LEFT JOIN tutors t ON tf.tutor_id = t.id
        WHERE st.is_active = true
        GROUP BY st.id, st.name, st.enrollment_number
        HAVING ROUND((COUNT(DISTINCT al.id)::numeric / COUNT(DISTINCT l.id)) * 100, 2) >= ${attendanceThreshold}
        ORDER BY attendance_percentage DESC, st.name
      `
      return NextResponse.json({ success: true, feedbackWithAttendance: feedbackWithAttendance.rows })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Admin feedback GET error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// POST - Manage feedback period (start/end)
export async function POST(request: NextRequest) {
  try {
    const { action, adminId } = await request.json()

    if (action === "start") {
      // Start feedback period
      const result = await sql`
        INSERT INTO feedback_settings (is_active, started_at, created_by)
        VALUES (true, CURRENT_TIMESTAMP, ${adminId})
        ON CONFLICT DO NOTHING
        RETURNING *
      `
      return NextResponse.json({ success: true, settings: result.rows[0] })
    }

    if (action === "end") {
      // End feedback period
      const result = await sql`
        UPDATE feedback_settings 
        SET is_active = false, ended_at = CURRENT_TIMESTAMP
        WHERE is_active = true
        RETURNING *
      `
      return NextResponse.json({ success: true, settings: result.rows[0] })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Admin feedback POST error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
