import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAccountsPersonnelAuth } from "@/lib/accounts-personnel-auth"

export async function PUT(request: Request) {
  try {
    const authResult = await verifyAccountsPersonnelAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Received body:", body)

    let { paymentId, amount, paymentDate, transactionId, notes } = body

    // Validate inputs exist
    if (!paymentId) {
      return NextResponse.json({ 
        error: "Missing paymentId",
        receivedBody: body
      }, { status: 400 })
    }

    // Convert and validate inputs
    paymentId = Number(paymentId)
    amount = Number(amount) || 0

    console.log("[v0] Converted values:", { paymentId, amount, paymentDate, transactionId })

    if (isNaN(paymentId) || !paymentId) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 })
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount - must be positive number" }, { status: 400 })
    }

    // Update the payment record directly
    console.log("[v0] Updating payment ID:", paymentId)
    
    const result = await sql`
      UPDATE fee_payments
      SET 
        amount_paid = ${amount},
        payment_date = ${paymentDate}::date,
        transaction_id = ${transactionId || null},
        notes = ${notes || null}
      WHERE id = ${paymentId}
      RETURNING id, amount_paid, payment_date, transaction_id
    `

    console.log("[v0] Update result:", result)

    if (result.length === 0) {
      return NextResponse.json({ error: "Payment not found or update failed" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Payment updated successfully",
      updatedPayment: result[0],
    })
  } catch (error) {
    console.error("[v0] Payment update error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Full error:", errorMessage)
    
    return NextResponse.json({ 
      error: "Internal server error", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
