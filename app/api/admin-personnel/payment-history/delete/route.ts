import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    // Check if payment exists
    const existingPayment = await db.query(
      "SELECT id FROM fee_payments WHERE id = $1",
      [paymentId]
    )

    if (existingPayment.rows.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Delete payment
    await db.query(
      "DELETE FROM fee_payments WHERE id = $1",
      [paymentId]
    )

    return NextResponse.json({ message: "Payment deleted successfully" })
  } catch (error) {
    console.error("[v0] Admin-personnel payment delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
