import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Get all lectures with their course and semester info
    const lectures = await sql`
      SELECT 
        l.id,
        l.title,
        l.subject_id,
        s.course_id,
        s.semester,
        COUNT(DISTINCT st.id) as student_count
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      LEFT JOIN students st ON st.course_id = s.course_id AND st.current_semester = s.semester
      GROUP BY l.id, l.title, l.subject_id, s.course_id, s.semester
      ORDER BY l.id DESC
      LIMIT 10
    `

    // Get student count by course and semester
    const studentsByCourseSemester = await sql`
      SELECT 
        course_id,
        current_semester,
        COUNT(*) as student_count
      FROM students
      GROUP BY course_id, current_semester
      ORDER BY course_id, current_semester
    `

    return Response.json({
      lectures,
      studentsByCourseSemester,
    })
  } catch (error) {
    console.error("[MYT] Debug error:", error)
    return Response.json({ error: "Debug query failed", details: String(error) }, { status: 500 })
  }
}
