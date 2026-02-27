import { type NextRequest, NextResponse } from "next/server"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateStudentAuth(request)
    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const authenticatedStudent = authResult.student
    const requestedStudentId = Number.parseInt(params.id)

    if (!authenticatedStudent || authenticatedStudent.id !== requestedStudentId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only access your own profile" },
        { status: 403 },
      )
    }

    // 2. Fetch Student Profile with course name
    const result = await sql`
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        s.course_id,
        s.email,
        s.phone_number,
        s.parent_phone_number,
        s.admission_semester,
        s.current_semester,
        s.resume_link,
        s.agreement_link,
        s.placement_status,
        s.company_name,
        s.placement_tenure_days,
        s.unique_code,
        s.created_at,

            -- ✅ ADD THESE 3 FIELDS
        s.caste,
        s.gender,
        s.profile_completed,
        c.name as course_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = ${requestedStudentId}
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const student = result[0]

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        // Explicitly exclude: password, password_hash, and any sensitive fields
      },
    })
  } catch (error) {
    console.error("[v0] Student Profile API Error:", error)
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 })
  }
}
