import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return Response.json({ success: false, error: "Missing student ID" }, { status: 400 })
    }

    const subjects = await sql`
      SELECT DISTINCT
        s.id,
        s.name,
        s.code,
        c.name as course_name,
        s.semester,
        t.name as tutor_name,
        t.department as tutor_department
      FROM subjects s
      JOIN courses c ON s.course_id = c.id
      JOIN tutor_subjects ts ON s.id = ts.subject_id
      JOIN tutors t ON ts.tutor_id = t.id
      WHERE s.course_id = (SELECT course_id FROM students WHERE id = ${Number.parseInt(studentId)})
        AND s.semester = (SELECT current_semester FROM students WHERE id = ${Number.parseInt(studentId)})
      ORDER BY s.name
    `

    return Response.json({ success: true, subjects })
  } catch (error) {
    console.error("Error fetching student subjects:", error)
    return Response.json({ success: false, error: "Failed to fetch subjects" }, { status: 500 })
  }
}
