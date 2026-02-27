import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateStudentAuth(request as any)
    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const authenticatedStudent = authResult.student
    const requestedStudentId = Number.parseInt(params.id)

    if (!authenticatedStudent || authenticatedStudent.id !== requestedStudentId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only view your own company list" },
        { status: 403 },
      )
    }

    const studentId = requestedStudentId

    // Get student's interests
    const studentInterests = await sql`
      SELECT interest_id FROM student_interests WHERE student_id = ${studentId}
    `
    const interestIds = studentInterests.map((si: any) => si.interest_id)

    // Get student's course and current_semester
    const studentRow = await sql`SELECT course_id, current_semester FROM students WHERE id = ${studentId}`
    const studentCourseId = studentRow[0]?.course_id
    const studentSemester = studentRow[0]?.current_semester

    const companies = await sql`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.application_deadline,
        c.interest_id,
        c.course_id,
        c.targeting_mode,
        i.name as interest_name,
        co.name as course_name,
        CASE WHEN ca.student_id IS NOT NULL THEN TRUE ELSE FALSE END as has_applied
      FROM companies c
      LEFT JOIN interests i ON c.interest_id = i.id
      LEFT JOIN courses co ON c.course_id = co.id
      LEFT JOIN company_applications ca ON c.id = ca.company_id AND ca.student_id = ${studentId}
      WHERE 
        (
          (c.targeting_mode = 'interest' AND c.interest_id = ANY(${interestIds}))
          OR
          (
            c.targeting_mode = 'course_semester'
            AND (
              (c.course_id = ${studentCourseId} AND c.semester = ${studentSemester})
              OR EXISTS (
                SELECT 1
                FROM company_course_semesters ccs
                WHERE ccs.company_id = c.id
                  AND ccs.course_id = ${studentCourseId}
                  AND ccs.semester = ${studentSemester}
              )
            )
          )
          OR
          (c.targeting_mode = 'students' AND EXISTS (
            SELECT 1 FROM company_recipients cr WHERE cr.company_id = c.id AND cr.student_id = ${studentId}
          ))
        )
      ORDER BY c.application_deadline DESC
    `

    const companiesWithDays = companies.map((company: any) => {
      const deadline = new Date(company.application_deadline)
      const today = new Date()
      const diffTime = deadline.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const isExpired = diffDays < 0
      return {
        ...company,
        days_remaining: Math.max(0, diffDays),
        is_expired: isExpired,
        status: isExpired ? "Expired" : "Active",
      }
    })

    return NextResponse.json({ success: true, companies: companiesWithDays })
  } catch (error) {
    console.error("Student companies fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch companies" }, { status: 500 })
  }
}
