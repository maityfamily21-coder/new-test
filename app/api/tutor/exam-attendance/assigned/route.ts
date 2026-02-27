import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tutorId = searchParams.get("tutorId")

    if (!tutorId) {
      return Response.json({ success: false, message: "Tutor ID required" }, { status: 400 })
    }

    // Get all exam-subject assignments for this tutor
    const assignments = await sql`
      SELECT 
        tma.id as assignment_id,
        tma.exam_id,
        tma.subject_id,
        e.exam_name,
        e.exam_date,
        s.name as subject_name,
        s.code as subject_code,
        c.id as course_id,
        c.name as course_name,
        e.semester
      FROM tutor_marks_assignments tma
      JOIN exams e ON tma.exam_id = e.id
      JOIN subjects s ON tma.subject_id = s.id
      JOIN courses c ON e.course_id = c.id
      WHERE tma.tutor_id = ${Number(tutorId)}
      ORDER BY e.exam_date DESC, e.exam_name
    `

    return Response.json({
      success: true,
      exams: assignments,
    })
  } catch (error) {
    console.error("[MYT] Error fetching assigned exams:", error)
    return Response.json(
      {
        success: false,
        message: "Failed to fetch assigned exams",
      },
      { status: 500 },
    )
  }
}
