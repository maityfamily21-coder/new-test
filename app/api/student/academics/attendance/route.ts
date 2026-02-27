import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return Response.json({ success: false, error: "Missing student ID" }, { status: 400 })
    }

    const attendance = await sql`
      SELECT 
        l.id,
        l.title,
        l.description,
        l.lecture_date,
        la.status,
        t.name as tutor_name,
        s.name as subject_name
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      JOIN tutors t ON l.tutor_id = t.id
      LEFT JOIN lecture_attendance la ON l.id = la.lecture_id AND la.student_id = ${Number.parseInt(studentId)}
      WHERE s.course_id = (SELECT course_id FROM students WHERE id = ${Number.parseInt(studentId)})
        AND s.semester = (SELECT current_semester FROM students WHERE id = ${Number.parseInt(studentId)})
        AND (
          l.batch_id IS NULL
          OR l.batch_id IN (
            SELECT DISTINCT batch_id FROM batch_students 
            WHERE student_id = ${Number.parseInt(studentId)}
          )
        )
      ORDER BY l.lecture_date DESC
    `

    const stats = {
      total: attendance.length,
      present: attendance.filter((a: any) => a.status === "Present").length,
      absent: attendance.filter((a: any) => a.status === "Absent").length,
      notMarked: attendance.filter((a: any) => a.status === null).length,
    }

    return Response.json({ success: true, attendance, stats })
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return Response.json({ success: false, error: "Failed to fetch attendance" }, { status: 500 })
  }
}
