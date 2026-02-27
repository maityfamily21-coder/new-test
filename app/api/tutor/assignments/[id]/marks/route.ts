import { neon } from "@neondatabase/serverless"
import { validateTutorAuth } from "@/lib/tutor-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateTutorAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tutorId = authResult.tutor.id
    const assignmentId = Number.parseInt(params.id)

    // Verify ownership
    const assignment = await sql`
      SELECT a.id, a.subject_id, s.course_id, s.semester
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.id = ${assignmentId} AND a.tutor_id = ${tutorId}
    `

    if (assignment.length === 0) {
      return Response.json({ success: false, error: "Assignment not found" }, { status: 404 })
    }

    const students = await sql`
      SELECT DISTINCT
        s.id,
        s.full_name,
        s.enrollment_number,
        am.marks_obtained,
        am.submitted_at
      FROM students s
      LEFT JOIN assignment_marks am ON s.id = am.student_id AND am.assignment_id = ${assignmentId}
      WHERE s.course_id = ${assignment[0].course_id} AND s.current_semester = ${assignment[0].semester}
      ORDER BY s.full_name
    `

    return Response.json({ success: true, students })
  } catch (error) {
    console.error("[v0] Assignment Marks API: Error fetching students:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch students",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateTutorAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tutorId = authResult.tutor.id
    const assignmentId = Number.parseInt(params.id)
    const { studentId, marks } = await request.json()

    if (!studentId || marks === undefined || marks === null) {
      return Response.json({ success: false, error: "Missing required fields: studentId, marks" }, { status: 400 })
    }

    // Verify ownership and assignment status
    const assignment = await sql`
      SELECT id, status FROM assignments WHERE id = ${assignmentId} AND tutor_id = ${tutorId}
    `

    if (assignment.length === 0) {
      return Response.json({ success: false, error: "Assignment not found" }, { status: 404 })
    }

    if (assignment[0].status !== "Ended") {
      return Response.json({ success: false, error: "Can only submit marks for ended assignments" }, { status: 400 })
    }

    // Upsert marks entry
    const result = await sql`
      INSERT INTO assignment_marks (assignment_id, student_id, marks_obtained, submitted_at)
      VALUES (${assignmentId}, ${studentId}, ${marks}, CURRENT_TIMESTAMP)
      ON CONFLICT (assignment_id, student_id) 
      DO UPDATE SET marks_obtained = ${marks}, submitted_at = CURRENT_TIMESTAMP
      RETURNING id, marks_obtained, submitted_at
    `

    return Response.json({ success: true, mark: result[0] })
  } catch (error) {
    console.error("[MYT] Assignment Marks API: Error submitting marks:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to submit marks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
