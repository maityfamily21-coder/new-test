import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const [
      totalStudentsResult,
      activeStudentsResult,
      placedStudentsResult,
      totalCompaniesResult,
      totalSeminarsResult,
      totalMessagesResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM students`,
      sql`SELECT COUNT(*) as count FROM students WHERE placement_status = 'Active'`,
      sql`SELECT COUNT(*) as count FROM students WHERE placement_status = 'Placed'`,
      sql`SELECT COUNT(*) as count FROM companies`,
      sql`SELECT COUNT(*) as count FROM seminars`,
      sql`SELECT COUNT(*) as count FROM messages`,
    ])

    const stats = {
      totalStudents: Number.parseInt(totalStudentsResult[0].count),
      activeStudents: Number.parseInt(activeStudentsResult[0].count),
      placedStudents: Number.parseInt(placedStudentsResult[0].count),
      totalCompanies: Number.parseInt(totalCompaniesResult[0].count),
      totalSeminars: Number.parseInt(totalSeminarsResult[0].count),
      totalMessages: Number.parseInt(totalMessagesResult[0].count),
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("Stats fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch stats" }, { status: 500 })
  }
}
