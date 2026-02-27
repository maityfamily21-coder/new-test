import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const students = await sql`
      SELECT 
        s.*,
        c.name as course_name,
        STRING_AGG(i.name, ', ') as interests
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN student_interests si ON s.id = si.student_id
      LEFT JOIN interests i ON si.interest_id = i.id
      GROUP BY s.id, c.name
      ORDER BY s.created_at DESC
    `

    const csvHeaders = [
      "full_name",
      "enrollment_number",
      "course_name",
      "email",
      "phone_number",
      "parent_phone_number",
      "admission_semester",
      "current_semester",
      "resume_link",
      "agreement_link",
      "placement_status",
      "company_name",
      "placement_tenure_days",
      "interests",
    ]

    const csvRows = students.map((student) => [
      student.full_name,
      student.enrollment_number,
      student.course_name,
      student.email,
      student.phone_number,
      student.parent_phone_number,
      student.admission_semester,
      student.current_semester,
      student.resume_link || "",
      student.agreement_link || "",
      student.placement_status,
      student.company_name || "",
      student.placement_tenure_days,
      `"${student.interests || ""}"`,
    ])

    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="students_export.csv"',
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ success: false, message: "Export failed" }, { status: 500 })
  }
}
