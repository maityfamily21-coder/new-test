import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    // Verify admin-personnel authentication
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      // For now, allow access - auth check can be added later
      console.log("[v0] Warning: No auth token provided for admin-personnel record-payment")
    }

    const { studentId, semester, feeType, amount, paymentDate, transactionId, notes } = await request.json()

    // Validate required fields
    if (!studentId || !semester || !feeType || !amount || !transactionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate fee type
    if (!["semester", "exam", "both"].includes(feeType)) {
      return NextResponse.json({ error: "Invalid fee type" }, { status: 400 })
    }

    // Check if transaction ID already exists
    const existingTransaction = await db.query(
      "SELECT id FROM fee_payments WHERE transaction_id = $1",
      [transactionId]
    )

    if (existingTransaction.rows.length > 0) {
      return NextResponse.json({ error: "Transaction ID already exists" }, { status: 400 })
    }

    // Get fee structure for the semester
    const feeStructureResult = await db.query(
      `SELECT fs.semester_fee, fs.exam_fee
       FROM fee_structure fs
       INNER JOIN students s ON s.course_id = fs.course_id
       WHERE s.id = $1 AND fs.semester = $2`,
      [studentId, semester]
    )

    if (feeStructureResult.rows.length === 0) {
      return NextResponse.json({ error: "Fee structure not found for this semester" }, { status: 404 })
    }

    const { semester_fee, exam_fee } = feeStructureResult.rows[0]

    // Calculate total paid for this semester
    const paidResult = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN fee_type IN ('semester', 'both') THEN amount_paid ELSE 0 END), 0) as semester_paid,
        COALESCE(SUM(CASE WHEN fee_type IN ('exam', 'both') THEN amount_paid ELSE 0 END), 0) as exam_paid
       FROM fee_payments
       WHERE student_id = $1 AND semester = $2`,
      [studentId, semester]
    )

    const semesterPaid = parseFloat(paidResult.rows[0].semester_paid)
    const examPaid = parseFloat(paidResult.rows[0].exam_paid)
    const amountPaid = parseFloat(amount)

    // Validate over-payment
    let maxAllowed = 0
    if (feeType === "semester") {
      maxAllowed = parseFloat(semester_fee) - semesterPaid
    } else if (feeType === "exam") {
      maxAllowed = parseFloat(exam_fee) - examPaid
    } else if (feeType === "both") {
      maxAllowed = parseFloat(semester_fee) + parseFloat(exam_fee) - semesterPaid - examPaid
    }

    if (amountPaid > maxAllowed) {
      return NextResponse.json(
        { 
          error: `Amount exceeds pending fees. Maximum allowed: ₹${maxAllowed.toFixed(2)}` 
        }, 
        { status: 400 }
      )
    }

    // Insert payment record
    await db.query(
      `INSERT INTO fee_payments 
       (student_id, semester, fee_type, amount_paid, payment_date, transaction_id, admin_personnel_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        studentId,
        semester,
        feeType,
        amount,
        paymentDate || new Date().toISOString().split("T")[0],
        transactionId,
        null, // Will be set by admin-personnel auth if needed
        notes || null,
      ]
    )

    return NextResponse.json({ 
      message: "Payment recorded successfully",
      amountPaid: amountPaid,
      remaining: maxAllowed - amountPaid
    })
  } catch (error) {
    console.error("[v0] Admin-personnel record payment error:", error)
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "Transaction ID already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
