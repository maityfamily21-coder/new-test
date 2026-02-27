import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tutorId = searchParams.get("tutorId")

    if (!tutorId) {
      return Response.json({ success: false, message: "Tutor ID required" }, { status: 400 })
    }

    // Get all subjects assigned to this tutor for marks entry
    const subjects = await sql`
      SELECT DISTINCT
        ema.id as assignment_id,
        ema.exam_id,
        e.exam_name,
        e.exam_date,
        ema.subject_id,
        s.name as subject_name,
        s.code,
        c.name as course_name,
        e.semester,
        es.total_marks,
        COUNT(DISTINCT em.student_id) as student_count,
        COUNT(DISTINCT CASE WHEN em.marks_obtained IS NOT NULL THEN em.student_id END) as submitted_count,
        ema.is_completed
      FROM exam_marks_assignment ema
      JOIN exams e ON ema.exam_id = e.id
      JOIN subjects s ON ema.subject_id = s.id
      JOIN courses c ON e.course_id = c.id
      JOIN exam_subjects es ON e.id = es.exam_id AND s.id = es.subject_id
      LEFT JOIN exam_marks em ON ema.exam_id = em.exam_id AND ema.subject_id = em.subject_id AND em.tutor_id = ${Number(tutorId)}
      WHERE ema.tutor_id = ${Number(tutorId)}
      GROUP BY ema.id, ema.exam_id, e.exam_name, e.exam_date, ema.subject_id, s.name, s.code, c.name, e.semester, es.total_marks
      ORDER BY e.exam_date DESC, s.name
    `

    return Response.json({
      success: true,
      subjects: subjects || [],
    })
  } catch (error) {
    console.error("[MYT] Error fetching tutor subjects:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
