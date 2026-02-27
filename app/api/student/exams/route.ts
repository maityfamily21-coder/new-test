import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      console.error("[MYT] Missing studentId")
      return Response.json({ error: "Missing studentId" }, { status: 400 })
    }

    // First get the student's course and semester
    const studentData = await sql`
      SELECT course_id, current_semester FROM students WHERE id = ${Number(studentId)}
    `

    if (!studentData || studentData.length === 0) {
      console.error("[MYT] Student not found")
      return Response.json({ error: "Student not found" }, { status: 404 })
    }

    const courseId = studentData[0].course_id
    const semester = studentData[0].current_semester

    console.log("[MYT] Fetching exams for student:", studentId, "courseId:", courseId, "semester:", semester)

    const query = `
      SELECT 
        e.id,
        e.exam_name,
        e.exam_date,
        e.course_id,
        e.semester,
        COALESCE(json_agg(
          json_build_object(
            'subject_id', es.subject_id,
            'subject_name', s.name,
            'total_marks', es.total_marks,
            'exam_date', es.exam_date,
            'exam_end_time', es.exam_end_time
          ) ORDER BY s.name
        ) FILTER (WHERE es.subject_id IS NOT NULL), '[]'::json) as subjects
      FROM exams e
      LEFT JOIN exam_subjects es ON e.id = es.exam_id
      LEFT JOIN subjects s ON es.subject_id = s.id
      WHERE e.course_id = $1 AND e.semester = $2
      GROUP BY e.id, e.exam_name, e.exam_date, e.course_id, e.semester
      ORDER BY e.exam_date DESC
    `

    const exams = await sql.query(query, [courseId, semester])

    console.log("[MYT] Exams found:", exams?.length || 0)
    return Response.json({ success: true, exams: exams || [] })
  } catch (error: any) {
    console.error("[MYT] Error fetching exams:", error.message)
    console.error("[MYT] Full error:", error)
    return Response.json({ error: "Failed to fetch exams", details: error.message }, { status: 500 })
  }
}
