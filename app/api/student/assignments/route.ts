import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const studentAuth = localStorage?.getItem?.("studentAuth")
    if (!studentAuth) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const studentData = JSON.parse(studentAuth)
    const studentId = studentData.id

    // Get all assignments for student's course-semester
    const assignments = await sql`
      SELECT 
        a.id,
        a.subject_id,
        a.title,
        a.description,
        a.total_marks,
        a.status,
        a.created_at,
        s.name as subject_name,
        s.code as subject_code,
        c.name as course_name,
        am.marks_obtained,
        am.submitted_at
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN assignment_marks am ON a.id = am.assignment_id AND am.student_id = ${studentId}
      WHERE s.course_id = (SELECT course_id FROM students WHERE id = ${studentId})
        AND s.semester = (SELECT semester FROM students WHERE id = ${studentId})
      ORDER BY a.created_at DESC
    `

    return Response.json({ success: true, assignments })
  } catch (error) {
    console.error("[MYT] Student Assignments API: Error:", error)
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
