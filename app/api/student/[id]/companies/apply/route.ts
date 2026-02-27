import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateStudentAuth(request)
    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const authenticatedStudent = authResult.student
    const requestedStudentId = Number.parseInt(params.id)

    if (!authenticatedStudent || authenticatedStudent.id !== requestedStudentId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only apply for companies using your own account" },
        { status: 403 },
      )
    }

    const studentId = requestedStudentId
    const { company_id } = await request.json()

    if (!company_id) {
      return NextResponse.json({ success: false, message: "Company ID is required" }, { status: 400 })
    }

    // Check if student has already applied
    const existingApplication = await sql`
      SELECT id FROM company_applications
      WHERE student_id = ${studentId} AND company_id = ${company_id}
    `

    if (existingApplication.length > 0) {
      return NextResponse.json({ success: false, message: "Already applied to this company" }, { status: 409 })
    }

    // Insert new application
    await sql`
      INSERT INTO company_applications (student_id, company_id)
      VALUES (${studentId}, ${company_id})
    `

    return NextResponse.json({ success: true, message: "Application submitted successfully" })
  } catch (error) {
    console.error("Company application error:", error)
    return NextResponse.json({ success: false, message: "Failed to submit application" }, { status: 500 })
  }
}
