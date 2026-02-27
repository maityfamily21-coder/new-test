import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")

    let query = `
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        COALESCE(ea.attendance_status, 'absent') as attendance_status,
        ea.scanned_at
      FROM students s
      LEFT JOIN exam_attendance ea ON s.id = ea.student_id 
        AND ea.exam_id = $1
    `

    const params_arr: any[] = [Number.parseInt(params.examId)]

    if (subjectId) {
      query += ` AND ea.subject_id = $2`
      params_arr.push(Number.parseInt(subjectId))
    }

    query += ` ORDER BY s.full_name`

    const attendance = await sql(query, params_arr)
    return Response.json(attendance)
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return Response.json({ error: "Failed to fetch attendance" }, { status: 500 })
  }
}
