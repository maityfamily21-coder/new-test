import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PUT(request: Request) {
  try {
    const { paymentId, amount, paymentDate, transactionId, notes } = await request.json()

    if (!paymentId || !amount || !paymentDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if payment exists
    const existingPayment = await db.query(
      "SELECT id FROM fee_payments WHERE id = $1",
      [paymentId]
    )

    if (existingPayment.rows.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // If transaction ID is being changed, check for duplicates
    if (transactionId) {
      const duplicateCheck = await db.query(
        "SELECT id FROM fee_payments WHERE transaction_id = $1 AND id != $2",
        [transactionId, paymentId]
      )

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json({ error: "Transaction ID already exists" }, { status: 400 })
      }
    }

    // Update payment
    await db.query(
      `UPDATE fee_payments 
       SET amount_paid = $1, payment_date = $2, transaction_id = $3, notes = $4, updated_at = NOW()
       WHERE id = $5`,
      [amount, paymentDate, transactionId || null, notes || null, paymentId]
    )

    return NextResponse.json({ message: "Payment updated successfully" })
  } catch (error) {
    console.error("[v0] Admin-personnel payment update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
