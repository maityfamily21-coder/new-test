import { neon } from "@neondatabase/serverless"
import { validateAdminAuth } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { examId: string } }) {
  try {
    const admin = await validateAdminAuth(request)
    if (!admin) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[MYT] Assign tutor request body:", body)

    const { exam_id, subject_id, tutor_id, course_id, semester } = body
    const examId = Number(params.examId)

    console.log("[MYT] Parsed values:", { examId, subject_id, tutor_id, course_id, semester })

    if (!examId || !subject_id || !tutor_id || !course_id || !semester) {
      console.log("[MYT] Missing required fields:", { examId, subject_id, tutor_id, course_id, semester })
      return Response.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    if (admin.role === "course_admin" && admin.assignedCourses && !admin.assignedCourses.includes(course_id)) {
      return Response.json({ success: false, message: "Access denied to this course" }, { status: 403 })
    }

    // Verify tutor exists
    const tutorExists = await sql`SELECT id FROM tutors WHERE id = ${tutor_id}`
    if (!tutorExists || tutorExists.length === 0) {
      return Response.json({ success: false, message: "Tutor not found" }, { status: 404 })
    }

    // Verify exam exists
    const examExists = await sql`SELECT id FROM exams WHERE id = ${examId}`
    if (!examExists || examExists.length === 0) {
      return Response.json({ success: false, message: "Exam not found" }, { status: 404 })
    }

    // Verify subject exists in exam
    const subjectInExam = await sql`
      SELECT es.id, es.total_marks FROM exam_subjects es
      WHERE es.exam_id = ${examId} AND es.subject_id = ${subject_id}
    `
    if (!subjectInExam || subjectInExam.length === 0) {
      return Response.json({ success: false, message: "Subject not found in exam" }, { status: 404 })
    }

    const totalMarks = subjectInExam[0].total_marks

    // Check if assignment already exists
    const existingAssignment = await sql`
      SELECT id FROM exam_marks_assignment 
      WHERE exam_id = ${examId} AND subject_id = ${subject_id}
    `

    if (existingAssignment && existingAssignment.length > 0) {
      return Response.json({ success: false, message: "Tutor already assigned for this subject" }, { status: 400 })
    }

    // Create assignment
    await sql`
      INSERT INTO exam_marks_assignment (exam_id, course_id, semester, subject_id, tutor_id)
      VALUES (${examId}, ${course_id}, ${semester}, ${subject_id}, ${tutor_id})
    `

    // Get all present students for this exam/subject and create marks records
    const presentStudents = await sql`
      SELECT DISTINCT ea.student_id FROM exam_attendance ea
      WHERE ea.exam_id = ${examId} AND ea.subject_id = ${subject_id} AND ea.attendance_status = 'present'
    `

    if (presentStudents && presentStudents.length > 0) {
      for (const student of presentStudents) {
        await sql`
          INSERT INTO exam_marks (exam_id, student_id, subject_id, tutor_id, total_marks, status)
          VALUES (${examId}, ${student.student_id}, ${subject_id}, ${tutor_id}, ${totalMarks}, 'pending')
          ON CONFLICT (exam_id, student_id, subject_id) 
          DO UPDATE SET tutor_id = ${tutor_id}
        `
      }
    }

    console.log("[MYT] Tutor assigned successfully. Students count:", presentStudents?.length || 0)

    return Response.json({
      success: true,
      message: `Tutor assigned successfully. Created marks records for ${presentStudents?.length || 0} students.`,
    })
  } catch (error) {
    console.error("[MYT] Error assigning tutor:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const admin = await validateAdminAuth(request)
    if (!admin) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const examId = Number(params.examId)

    let assignments
    if (admin.role === "course_admin" && admin.assignedCourses) {
      assignments = await sql`
        SELECT 
          ema.id,
          ema.exam_id,
          ema.subject_id,
          s.name as subject_name,
          ema.tutor_id,
          t.name as tutor_name,
          ema.is_completed,
          ema.assignment_date
        FROM exam_marks_assignment ema
        JOIN subjects s ON ema.subject_id = s.id
        JOIN tutors t ON ema.tutor_id = t.id
        WHERE ema.exam_id = ${examId} AND ema.course_id = ANY(${admin.assignedCourses})
        ORDER BY s.name
      `
    } else {
      assignments = await sql`
        SELECT 
          ema.id,
          ema.exam_id,
          ema.subject_id,
          s.name as subject_name,
          ema.tutor_id,
          t.name as tutor_name,
          ema.is_completed,
          ema.assignment_date
        FROM exam_marks_assignment ema
        JOIN subjects s ON ema.subject_id = s.id
        JOIN tutors t ON ema.tutor_id = t.id
        WHERE ema.exam_id = ${examId}
        ORDER BY s.name
      `
    }

    return Response.json({ success: true, assignments })
  } catch (error) {
    console.error("[MYT] Error fetching assignments:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
