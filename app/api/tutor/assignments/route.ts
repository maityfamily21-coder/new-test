import { neon } from "@neondatabase/serverless"
import { validateTutorAuth } from "@/lib/tutor-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const authResult = await validateTutorAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tutorId = authResult.tutor.id

    // Get all assignments for this tutor with student counts
    const assignments = await sql`
      SELECT 
        a.id,
        a.subject_id,
        a.title,
        a.description,
        a.total_marks,
        a.status,
        a.created_at,
        a.updated_at,
        s.name as subject_name,
        s.code as subject_code,
        c.name as course_name,
        s.semester,
        COUNT(DISTINCT st.id) as total_students,
        COUNT(DISTINCT CASE WHEN am.marks_obtained IS NOT NULL THEN am.id END) as marks_submitted
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN lecture_attendance la ON s.id = la.lecture_id
      LEFT JOIN students st ON la.student_id = st.id
      LEFT JOIN assignment_marks am ON a.id = am.assignment_id
      WHERE a.tutor_id = ${tutorId}
      GROUP BY a.id, s.id, c.id
      ORDER BY a.created_at DESC
    `

    return Response.json({ success: true, assignments })
  } catch (error) {
    console.error("[MYT] Assignment API: Error fetching assignments:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch assignments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await validateTutorAuth(request)
    if (!authResult.success) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const tutorId = authResult.tutor.id
    const { subjectId, title, description, totalMarks } = await request.json()

    if (!subjectId || !title || !totalMarks) {
      return Response.json(
        { success: false, error: "Missing required fields: subjectId, title, totalMarks" },
        { status: 400 },
      )
    }

    // Verify tutor has this subject assigned
    const tutorSubject = await sql`
      SELECT ts.id FROM tutor_subjects ts
      WHERE ts.tutor_id = ${tutorId} AND ts.subject_id = ${subjectId}
    `

    if (tutorSubject.length === 0) {
      return Response.json({ success: false, error: "You are not assigned to this subject" }, { status: 403 })
    }

    // Create assignment
    const result = await sql`
      INSERT INTO assignments (subject_id, tutor_id, title, description, total_marks, status)
      VALUES (${subjectId}, ${tutorId}, ${title}, ${description || null}, ${totalMarks}, 'Active')
      RETURNING id, title, status, total_marks, created_at
    `

    console.log("[MYT] Assignment API: Created assignment:", result[0])
    return Response.json({ success: true, assignment: result[0] })
  } catch (error) {
    console.error("[MYT] Assignment API: Error creating assignment:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to create assignment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
