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
            COALESCE((SELECT COUNT(DISTINCT id) FROM students), 0) as total_eligible_students,
            COALESCE((SELECT COUNT(DISTINCT student_id) FROM tutor_feedback), 0) as total_submitted,
            COALESCE((SELECT COUNT(DISTINCT id) FROM tutor_feedback), 0) as total_feedback_count,
            COALESCE(ROUND((SELECT COUNT(DISTINCT student_id) FROM tutor_feedback)::numeric / 
                  NULLIF((SELECT COUNT(DISTINCT id) FROM students), 0) * 100, 2), 0) as completion_percentage,
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
      // Tutor-wise breakdown - directly from feedback data
      try {
        const tutorWiseResult = await sql`
          SELECT 
            t.id,
            t.name,
            s.id as subject_id,
            s.name as subject_name,
            COUNT(DISTINCT tf.student_id) as feedback_count,
            ROUND(AVG(tf.rating)::numeric, 2) as average_rating,
            COUNT(DISTINCT CASE WHEN tf.rating >= 4 THEN tf.student_id END) as positive_count,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'student_id', st.id,
                'student_name', st.name,
                'enrollment_number', st.enrollment_number,
                'rating', tf.rating,
                'comments', tf.comments
              )
              ORDER BY st.name
            ) FILTER (WHERE tf.id IS NOT NULL) as student_feedback
          FROM tutor_feedback tf
          JOIN tutors t ON tf.tutor_id = t.id
          JOIN subjects s ON tf.subject_id = s.id
          LEFT JOIN students st ON tf.student_id = st.id
          GROUP BY t.id, t.name, s.id, s.name
          ORDER BY t.name, s.name
        `
        console.log("[v0] Tutorwise data found:", tutorWiseResult.rows.length, "entries")
        return NextResponse.json({ success: true, tutorwise: tutorWiseResult.rows })
      } catch (tableError: any) {
        console.error("[v0] Tutorwise query error:", tableError.message)
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, tutorwise: [] })
        }
        throw tableError
      }
    }

    if (action === "studentwise") {
      // Student-wise tracking - show feedback submitted and pending
      try {
        const studentWiseResult = await sql`
          SELECT 
            st.id,
            st.name,
            st.enrollment_number,
            COUNT(DISTINCT tf.id) as submitted_count,
            (SELECT COUNT(DISTINCT s.id) FROM subjects s WHERE s.course_id = st.course_id AND s.semester = st.current_semester) as eligible_count,
            ROUND(COALESCE(COUNT(DISTINCT tf.id)::numeric / NULLIF((SELECT COUNT(DISTINCT s.id) FROM subjects s WHERE s.course_id = st.course_id AND s.semester = st.current_semester), 0) * 100, 0), 2) as completion_percentage,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'tutor_id', t.id,
                'tutor_name', t.name,
                'subject_id', s.id,
                'subject_name', s.name,
                'rating', tf.rating,
                'comments', tf.comments
              )
              ORDER BY t.name
            ) FILTER (WHERE tf.id IS NOT NULL) as submitted_feedback
          FROM students st
          LEFT JOIN tutor_feedback tf ON st.id = tf.student_id
          LEFT JOIN tutors t ON tf.tutor_id = t.id
          LEFT JOIN subjects s ON tf.subject_id = s.id
          GROUP BY st.id, st.name, st.enrollment_number
          ORDER BY st.name
        `
        console.log("[v0] Studentwise data found:", studentWiseResult.rows.length, "entries")
        return NextResponse.json({ success: true, studentwise: studentWiseResult.rows })
      } catch (tableError: any) {
        console.error("[v0] Studentwise query error:", tableError.message)
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, studentwise: [] })
        }
        throw tableError
      }
    }

    if (action === "withattendance") {
      // Get feedback filtered by attendance percentage
      try {
        const feedbackWithAttendance = await sql`
          SELECT DISTINCT
            tf.id,
            st.id as student_id,
            st.name as student_name,
            st.enrollment_number,
            t.id as tutor_id,
            t.name as tutor_name,
            s.id as subject_id,
            s.name as subject_name,
            c.name as course_name,
            s.semester,
            tf.rating,
            tf.comments,
            COALESCE(ROUND((COUNT(DISTINCT al.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2), 0) as attendance_percentage
          FROM tutor_feedback tf
          JOIN students st ON tf.student_id = st.id
          JOIN tutors t ON tf.tutor_id = t.id
          JOIN subjects s ON tf.subject_id = s.id
          JOIN courses c ON s.course_id = c.id
          LEFT JOIN lectures l ON s.id = l.subject_id
          LEFT JOIN attendance_logs al ON st.id = al.student_id AND l.id = al.lecture_id AND l.id IS NOT NULL
          GROUP BY tf.id, st.id, st.name, st.enrollment_number, t.id, t.name, s.id, s.name, c.name, s.semester, tf.rating, tf.comments
          HAVING COALESCE(ROUND((COUNT(DISTINCT al.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0)) * 100, 2), 0) >= ${attendanceThreshold}
          ORDER BY c.name, s.semester, st.name
        `
        console.log("[v0] Attendance filtered data found:", feedbackWithAttendance.rows.length)
        return NextResponse.json({ success: true, feedbackWithAttendance: feedbackWithAttendance.rows })
      } catch (tableError: any) {
        console.error("[v0] Attendance filter error:", tableError.message)
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
