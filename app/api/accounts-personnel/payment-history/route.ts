import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAccountsPersonnelAuth } from "@/lib/accounts-personnel-auth"

export async function GET(request: Request) {
  try {
    const authResult = await verifyAccountsPersonnelAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })
    }

    // Get all payment history for the student
    const paymentHistory = await sql`
      SELECT 
        id,
        semester,
        fee_type,
        amount_paid,
        payment_date,
        transaction_id,
        notes,
        created_at
      FROM fee_payments
      WHERE student_id = ${studentId}
      ORDER BY payment_date DESC, created_at DESC
    `

    return NextResponse.json({
      paymentHistory: paymentHistory.map((row: any) => ({
        id: row.id,
        semester: row.semester,
        feeType: row.fee_type,
        amount: Number(row.amount_paid),
        paymentDate: row.payment_date,
        transactionId: row.transaction_id,
        notes: row.notes,
        recordedAt: row.created_at,
      })),
      success: true,
    })
  } catch (error) {
    console.error("[v0] Payment history fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
