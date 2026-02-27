import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAccountsPersonnelAuth } from "@/lib/accounts-personnel-auth"

export async function DELETE(request: Request) {
  try {
    const authResult = await verifyAccountsPersonnelAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 })
    }

    // Get the payment details before deleting
    const payment = await sql`
      SELECT id, student_id, amount_paid, fee_type, semester
      FROM fee_payments
      WHERE id = ${paymentId}
    `

    if (payment.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Delete the payment
    await sql`
      DELETE FROM fee_payments
      WHERE id = ${paymentId}
    `

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully",
      deletedPayment: {
        id: payment[0].id,
        studentId: payment[0].student_id,
        amount: Number(payment[0].amount_paid),
        feeType: payment[0].fee_type,
        semester: payment[0].semester,
      },
    })
  } catch (error) {
    console.error("[v0] Payment delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
