import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const tutorId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "subjects"

    if (view === "subjects") {
      // Fetch tutor's subjects with lecture count
      const subjects = await sql`
        SELECT 
          s.id,
          s.name,
          s.code,
          c.name as course_name,
          s.semester,
          COUNT(DISTINCT l.id) as lecture_count,
          COUNT(DISTINCT CASE WHEN la.id IS NOT NULL THEN la.id END) as total_attendance_records
        FROM subjects s
        JOIN courses c ON s.course_id = c.id
        JOIN tutor_subjects ts ON s.id = ts.subject_id
        LEFT JOIN lectures l ON s.id = l.subject_id AND l.tutor_id = ${tutorId}
        LEFT JOIN lecture_attendance la ON l.id = la.lecture_id
        WHERE ts.tutor_id = ${tutorId}
        GROUP BY s.id, s.name, s.code, c.name, s.semester
        ORDER BY c.name, s.semester, s.name
      `
      return Response.json({ success: true, subjects })
    } else if (view === "all-lectures") {
      // Fetch all lectures for the tutor across all subjects
      const lectures = await sql`
        SELECT 
          l.id,
          l.title,
          l.description,
          l.lecture_date,
          s.name as subject_name,
          s.code as subject_code,
          c.name as course_name,
          s.semester,
          (SELECT COUNT(*) FROM students WHERE course_id = s.course_id AND current_semester = s.semester) as total_students,
          COUNT(DISTINCT CASE WHEN la.status = 'Present' THEN la.student_id END) as present_count,
          COUNT(DISTINCT CASE WHEN la.status = 'Absent' THEN la.student_id END) as absent_count,
          (SELECT COUNT(*) FROM students WHERE course_id = s.course_id AND current_semester = s.semester) - COUNT(DISTINCT la.student_id) as not_marked_count
        FROM lectures l
        JOIN subjects s ON l.subject_id = s.id
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN lecture_attendance la ON l.id = la.lecture_id
        WHERE l.tutor_id = ${tutorId}
        GROUP BY l.id, l.title, l.description, l.lecture_date, s.name, s.code, c.name, s.semester, s.course_id
        ORDER BY l.lecture_date DESC
      `
      return Response.json({ success: true, lectures })
    } else if (view === "subject-lectures") {
      // Fetch lectures for a specific subject
      const subjectId = searchParams.get("subjectId")
      if (!subjectId) {
        return Response.json({ success: false, error: "Missing subjectId" }, { status: 400 })
      }

      const lectures = await sql`
        SELECT 
          l.id,
          l.title,
          l.description,
          l.lecture_date,
          s.name as subject_name,
          s.code as subject_code,
          c.name as course_name,
          s.semester,
          (SELECT COUNT(*) FROM students WHERE course_id = s.course_id AND current_semester = s.semester) as total_students,
          COUNT(DISTINCT CASE WHEN la.status = 'Present' THEN la.student_id END) as present_count,
          COUNT(DISTINCT CASE WHEN la.status = 'Absent' THEN la.student_id END) as absent_count,
          (SELECT COUNT(*) FROM students WHERE course_id = s.course_id AND current_semester = s.semester) - COUNT(DISTINCT la.student_id) as not_marked_count
        FROM lectures l
        JOIN subjects s ON l.subject_id = s.id
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN lecture_attendance la ON l.id = la.lecture_id
        WHERE l.subject_id = ${Number.parseInt(subjectId)}
          AND l.tutor_id = ${tutorId}
        GROUP BY l.id, l.title, l.description, l.lecture_date, s.name, s.code, c.name, s.semester, s.course_id
        ORDER BY l.lecture_date DESC
      `
      return Response.json({ success: true, lectures })
    }

    return Response.json({ success: false, error: "Invalid view parameter" }, { status: 400 })
  } catch (error) {
    console.error("Error fetching tutor tracking data:", error)
    return Response.json({ success: false, error: "Failed to fetch data" }, { status: 500 })
  }
}
