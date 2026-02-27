import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")
    const courseId = searchParams.get("courseId")
    const semester = searchParams.get("semester")

    if (!subjectId || !courseId || !semester) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const students = await sql`
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        COALESCE(ea.attendance_status, 'absent') as attendance_status,
        ea.scanned_at
      FROM students s
      LEFT JOIN exam_attendance ea ON s.id = ea.student_id 
        AND ea.exam_id = ${Number(params.examId)}
        AND ea.subject_id = ${Number(subjectId)}
      WHERE s.course_id = ${Number(courseId)}
        AND s.semester = ${Number(semester)}
      ORDER BY s.full_name
    `

    return Response.json(students)
  } catch (error) {
    console.error("[MYT] Error fetching students:", error)
    return Response.json({ error: "Failed to fetch students" }, { status: 500 })
  }
}
