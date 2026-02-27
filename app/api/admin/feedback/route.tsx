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
      try {
        const summaryResult = await sql`
          SELECT 
            COALESCE((SELECT COUNT(DISTINCT id) FROM students WHERE is_active = true), 0) as total_eligible_students,
            COALESCE((SELECT COUNT(DISTINCT student_id) FROM tutor_feedback), 0) as total_submitted,
            COALESCE((SELECT COUNT(DISTINCT id) FROM tutor_feedback), 0) as total_feedback_count,
            COALESCE(ROUND((SELECT COUNT(DISTINCT student_id) FROM tutor_feedback)::numeric / 
                  NULLIF((SELECT COUNT(DISTINCT id) FROM students WHERE is_active = true), 0) * 100, 2), 0) as completion_percentage,
            COALESCE((SELECT AVG(rating) FROM tutor_feedback), 0) as overall_avg_rating
        `
        return NextResponse.json({ success: true, summary: summaryResult.rows[0] })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ 
            success: true, 
            summary: {
              total_eligible_students: 0,
              total_submitted: 0,
              total_feedback_count: 0,
              completion_percentage: 0,
              overall_avg_rating: 0
            }
          })
        }
        throw tableError
      }
    }

    if (action === "tutorwise") {
      // Tutor-wise breakdown with attendance filter
      try {
        const tutorWiseResult = await sql`
          SELECT 
            t.id,
            t.name,
            COALESCE(s.name, 'Unknown') as subject_name,
            COALESCE(COUNT(DISTINCT tf.student_id), 0) as feedback_count,
            COALESCE(ROUND(AVG(tf.rating)::numeric, 2), 0) as average_rating,
            COALESCE(COUNT(DISTINCT CASE WHEN tf.rating >= 4 THEN tf.student_id END), 0) as positive_count
          FROM tutors t
          LEFT JOIN subject_tutors st ON t.id = st.tutor_id
          LEFT JOIN subjects s ON st.subject_id = s.id
          LEFT JOIN tutor_feedback tf ON t.id = tf.tutor_id AND s.id = tf.subject_id
          GROUP BY t.id, t.name, s.name
          ORDER BY t.name, s.name
        `
        return NextResponse.json({ success: true, tutorwise: tutorWiseResult.rows })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, tutorwise: [] })
        }
        throw tableError
      }
    }

    if (action === "studentwise") {
      // Student-wise tracking
      try {
        const studentWiseResult = await sql`
          SELECT 
            st.id,
            st.name,
            st.enrollment_number,
            COALESCE(COUNT(DISTINCT tf.id), 0) as submitted_count,
            COALESCE((SELECT COUNT(DISTINCT s.id) FROM subjects s 
             JOIN enrollments e ON s.id = e.subject_id
             WHERE e.student_id = st.id), 0) as eligible_count,
            COALESCE(ARRAY_AGG(DISTINCT CASE WHEN tf.id IS NULL THEN s.name END) FILTER (WHERE tf.id IS NULL), ARRAY[]::text[]) as pending_subjects
          FROM students st
          LEFT JOIN enrollments e ON st.id = e.student_id
          LEFT JOIN subjects s ON e.subject_id = s.id
          LEFT JOIN tutor_feedback tf ON st.id = tf.student_id AND s.id = tf.subject_id
          WHERE st.is_active = true
          GROUP BY st.id, st.name, st.enrollment_number
          ORDER BY st.name
        `
        return NextResponse.json({ success: true, studentwise: studentWiseResult.rows })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, studentwise: [] })
        }
        throw tableError
      }
    }

    if (action === "withattendance") {
      // Get feedback with attendance filtering
      try {
        const feedbackWithAttendance = await sql`
          SELECT 
            st.id,
            st.name,
            st.enrollment_number,
            COALESCE(ROUND((COUNT(DISTINCT al.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2), 0) as attendance_percentage,
            COALESCE(COUNT(DISTINCT tf.id), 0) as submitted_count,
            COALESCE(ARRAY_AGG(DISTINCT t.name) FILTER (WHERE tf.id IS NOT NULL), ARRAY[]::text[]) as tutors_rated
          FROM students st
          LEFT JOIN enrollments e ON st.id = e.student_id
          LEFT JOIN lectures l ON e.subject_id = l.subject_id
          LEFT JOIN attendance_logs al ON st.id = al.student_id AND l.id = al.lecture_id
          LEFT JOIN tutor_feedback tf ON st.id = tf.student_id
          LEFT JOIN tutors t ON tf.tutor_id = t.id
          WHERE st.is_active = true
          GROUP BY st.id, st.name, st.enrollment_number
          HAVING COALESCE(ROUND((COUNT(DISTINCT al.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2), 0) >= ${attendanceThreshold}
          ORDER BY attendance_percentage DESC, st.name
        `
        return NextResponse.json({ success: true, feedbackWithAttendance: feedbackWithAttendance.rows })
      } catch (tableError: any) {
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, feedbackWithAttendance: [] })
        }
        throw tableError
      }
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
