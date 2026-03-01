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
      // Tutor-wise breakdown - get all feedback grouped by tutor and subject
      try {
        // First get all tutors with feedback
        const tutorWiseResult = await sql`
          SELECT DISTINCT
            t.id,
            t.name
          FROM tutor_feedback tf
          JOIN tutors t ON tf.tutor_id = t.id
          ORDER BY t.name
        `
        console.log("[v0] Tutorwise tutors found:", tutorWiseResult.rows.length)
        
        // For each tutor, get their subject feedback summaries
        const tutorData = await Promise.all(
          tutorWiseResult.rows.map(async (tutor: any) => {
            const subjectData = await sql`
              SELECT 
                s.id as subject_id,
                s.name as subject_name,
                COUNT(DISTINCT tf.student_id) as feedback_count,
                ROUND(AVG(tf.rating)::numeric, 2) as average_rating,
                COUNT(DISTINCT CASE WHEN tf.rating >= 4 THEN tf.student_id END) as positive_count
              FROM tutor_feedback tf
              JOIN subjects s ON tf.subject_id = s.id
              WHERE tf.tutor_id = ${tutor.id}
              GROUP BY s.id, s.name
              ORDER BY s.name
            `
            return {
              id: tutor.id,
              name: tutor.name,
              subjects: subjectData.rows
            }
          })
        )
        
        console.log("[v0] Tutorwise data prepared:", tutorData.length, "tutors")
        return NextResponse.json({ success: true, tutorwise: tutorData })
      } catch (tableError: any) {
        console.error("[v0] Tutorwise query error:", tableError.message)
        if (tableError.message?.includes("does not exist")) {
          return NextResponse.json({ success: true, tutorwise: [] })
        }
        throw tableError
      }
    }

    if (action === "studentwise") {
      // Student-wise tracking - show all students and their feedback status
      try {
        const studentWiseResult = await sql`
          SELECT DISTINCT
            st.id,
            st.name,
            st.enrollment_number,
            st.course_id,
            st.current_semester
          FROM students st
          ORDER BY st.name
        `
        console.log("[v0] Students found:", studentWiseResult.rows.length)
        
        // For each student, get their feedback submission status
        const studentData = await Promise.all(
          studentWiseResult.rows.map(async (student: any) => {
            const submittedFeedback = await sql`
              SELECT 
                tf.id,
                t.id as tutor_id,
                t.name as tutor_name,
                s.id as subject_id,
                s.name as subject_name,
                tf.rating,
                tf.comments
              FROM tutor_feedback tf
              JOIN tutors t ON tf.tutor_id = t.id
              JOIN subjects s ON tf.subject_id = s.id
              WHERE tf.student_id = ${student.id}
              ORDER BY t.name, s.name
            `
            
            const eligibleSubjects = await sql`
              SELECT COUNT(DISTINCT s.id) as count
              FROM subjects s
              WHERE s.course_id = ${student.course_id}
              AND s.semester = ${student.current_semester}
            `
            
            const eligible = eligibleSubjects.rows[0]?.count || 0
            const submitted = submittedFeedback.rows.length
            const completion = eligible > 0 ? Math.round((submitted / eligible) * 100) : 0
            
            return {
              id: student.id,
              name: student.name,
              enrollment_number: student.enrollment_number,
              submitted_count: submitted,
              eligible_count: eligible,
              completion_percentage: completion,
              submitted_feedback: submittedFeedback.rows
            }
          })
        )
        
        console.log("[v0] Studentwise data prepared:", studentData.length, "students")
        return NextResponse.json({ success: true, studentwise: studentData })
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
