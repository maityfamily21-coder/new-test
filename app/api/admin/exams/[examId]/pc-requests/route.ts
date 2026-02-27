import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { examId: string } }) {
  try {
    const { examId } = params

    // Get PC requests grouped by subject for this exam
    const pcRequests = await sql`
      SELECT 
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        COUNT(pr.id) as request_count,
        json_agg(
          json_build_object(
            'student_id', st.id,
            'student_name', st.full_name,
            'enrollment_number', st.enrollment_number,
            'requested_at', pr.requested_at
          ) ORDER BY pr.requested_at DESC
        ) as students
      FROM pc_requests pr
      INNER JOIN subjects s ON pr.subject_id = s.id
      INNER JOIN students st ON pr.student_id = st.id
      WHERE pr.exam_id = ${Number.parseInt(examId)}
      GROUP BY s.id, s.name, s.code
      ORDER BY s.name
    `

    return NextResponse.json(pcRequests)
  } catch (error) {
    console.error("Error fetching PC requests:", error)
    return NextResponse.json({ error: "Failed to fetch PC requests" }, { status: 500 })
  }
}
