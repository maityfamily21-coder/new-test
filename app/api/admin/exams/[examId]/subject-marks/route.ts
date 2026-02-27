import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest, { params }: { params: { examId: string } }) {
  const examId = Number(params.examId)
  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get("subjectId")

  console.log("[v0] Fetching marks for examId:", examId, "subjectId:", subjectId)

  if (!subjectId) {
    return NextResponse.json({ success: false, message: "Subject ID is required" }, { status: 400 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)

    // First, get the tutor assigned to this exam/subject
    const assignment = await sql`
      SELECT tutor_id FROM exam_marks_assignment 
      WHERE exam_id = ${examId} AND subject_id = ${Number(subjectId)}
      LIMIT 1
    `

    console.log("[v0] Assignment found:", assignment)

    if (!assignment || assignment.length === 0) {
      return NextResponse.json({ 
        success: true, 
        marks: [],
        message: "No tutor assigned to this subject yet" 
      })
    }

    const assignedTutorId = assignment[0].tutor_id

    // Get marks only for the assigned tutor
    const marks = await sql`
      SELECT 
        s.full_name as student_name,
        s.enrollment_number,
        em.marks_obtained,
        em.total_marks,
        em.status,
        em.submission_date,
        t.name as tutor_name
      FROM exam_marks em
      JOIN students s ON em.student_id = s.id
      JOIN tutors t ON em.tutor_id = t.id
      WHERE em.exam_id = ${examId}
        AND em.subject_id = ${Number(subjectId)}
        AND em.tutor_id = ${assignedTutorId}
      ORDER BY s.enrollment_number ASC
    `

    console.log("[v0] Marks query result:", marks.length, "records found")

    return NextResponse.json({ success: true, marks })
  } catch (error: any) {
    console.error("[v0] Error fetching marks:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
