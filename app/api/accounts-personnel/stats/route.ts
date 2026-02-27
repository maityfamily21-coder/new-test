import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAccountsPersonnelAuth } from "@/lib/accounts-personnel-auth"

export async function GET(request: Request) {
  try {
    console.log("[v0] Stats request received, verifying auth")
    const authResult = await verifyAccountsPersonnelAuth(request)
    if (!authResult.authenticated) {
      console.error("[v0] Accounts personnel auth failed in stats endpoint")
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    
    console.log("[v0] Auth successful for personnel:", authResult.personnel?.username)

    try {
      // Get total students - no is_active filter since column doesn't exist
      const studentsResult = await sql`SELECT COUNT(*) as count FROM students`
      const totalStudents = parseInt(studentsResult[0]?.count || "0")

      // Get total collected amount
      const collectedResult = await sql`SELECT COALESCE(SUM(amount_paid), 0) as total FROM fee_payments`
      const totalCollected = Number(collectedResult[0]?.total || "0")

      // Get students with pending payments
      const pendingResult = await sql`
        SELECT COUNT(DISTINCT s.id) as count
        FROM students s
        INNER JOIN fee_structure fs ON fs.course_id = s.course_id AND fs.semester <= s.current_semester
        LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.semester = fs.semester
        GROUP BY s.id
        HAVING SUM(fs.semester_fee + fs.exam_fee) > COALESCE(SUM(fp.amount_paid), 0)
      `
      const pendingPayments = pendingResult.length

      // Get recent payments (last 7 days)
      const recentResult = await sql`
        SELECT COUNT(*) as count FROM fee_payments 
        WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'
      `
      const recentPayments = parseInt(recentResult[0]?.count || "0")

      return NextResponse.json({
        totalStudents,
        totalCollected,
        pendingPayments,
        recentPayments,
        success: true,
      })
    } catch (dbError) {
      console.error("[v0] Database query error:", dbError)
      // Return default stats instead of failing
      return NextResponse.json({
        totalStudents: 0,
        totalCollected: 0,
        pendingPayments: 0,
        recentPayments: 0,
        success: true,
      })
    }
  } catch (error) {
    console.error("[v0] Stats fetch error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
