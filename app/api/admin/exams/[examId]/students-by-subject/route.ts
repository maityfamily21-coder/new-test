import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const semester = searchParams.get("semester")
    const subjectId = searchParams.get("subjectId")

    if (!courseId || !semester || !subjectId) {
      return Response.json({ error: "Missing courseId, semester, or subjectId" }, { status: 400 })
    }

    // and properly display attendance as 'scanned' if present, otherwise 'absent'
    const students = await sql`
      SELECT DISTINCT
        s.id,
        s.full_name,
        s.enrollment_number,
        CASE 
          WHEN ea.attendance_status = 'present' THEN 'present'
          ELSE 'absent'
        END as attendance_status,
        ea.scanned_at
      FROM students s
      LEFT JOIN exam_attendance ea ON s.id = ea.student_id 
        AND ea.exam_id = ${Number.parseInt(params.examId)}
        AND ea.subject_id = ${Number.parseInt(subjectId)}
      WHERE s.course_id = ${Number.parseInt(courseId)} 
        AND s.current_semester = ${Number.parseInt(semester)}
      ORDER BY s.full_name
    `

    return Response.json(students || [])
  } catch (error: any) {
    console.error("[MYT] Error fetching students by subject:", error.message)
    return Response.json({ error: "Failed to fetch students", details: error.message }, { status: 500 })
  }
}
