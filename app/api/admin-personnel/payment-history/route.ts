import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const result = await db.query(
      `SELECT 
        id,
        semester,
        fee_type as "feeType",
        amount_paid as amount,
        payment_date as "paymentDate",
        transaction_id as "transactionId",
        notes,
        created_at as "recordedAt"
       FROM fee_payments
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [studentId]
    )

    const paymentHistory = result.rows.map((row: any) => ({
      id: row.id,
      semester: row.semester,
      feeType: row.feeType,
      amount: Number(row.amount),
      paymentDate: row.paymentDate,
      transactionId: row.transactionId,
      notes: row.notes,
      recordedAt: row.recordedAt,
    }))

    return NextResponse.json({ paymentHistory, success: true })
  } catch (error) {
    console.error("[v0] Admin-personnel payment history fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
