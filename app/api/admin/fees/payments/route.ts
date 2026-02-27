import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAccountsPersonnelAuth, createAccountsPersonnelUnauthorizedResponse } from "@/lib/accounts-personnel-auth"
import { validateAdminAuth } from "@/lib/admin-auth"

// GET: Fetch payment records for a student
export async function GET(request: NextRequest) {
  // Allow both admin and accounts personnel
  const adminAuth = await validateAdminAuth(request)
  const personnelAuth = await validateAccountsPersonnelAuth(request)

  if (!adminAuth.success && !personnelAuth.success) {
    return createAccountsPersonnelUnauthorizedResponse("Unauthorized access")
  }

  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const enrollmentNumber = searchParams.get("enrollmentNumber")

    console.log("[v0] Fetching payments for studentId:", studentId, "enrollmentNumber:", enrollmentNumber)

    if (!studentId && !enrollmentNumber) {
      console.error("[v0] Neither studentId nor enrollmentNumber provided")
      return NextResponse.json(
        { success: false, message: "Student ID or enrollment number is required" },
        { status: 400 }
      )
    }

    let student
    if (enrollmentNumber) {
      const studentResult = await sql`
        SELECT id, full_name, enrollment_number, course_id, current_semester
        FROM students
        WHERE enrollment_number = ${enrollmentNumber}
      `
      if (studentResult.length === 0) {
        return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
      }
      student = studentResult[0]
    } else {
      const studentResult = await sql`
        SELECT id, full_name, enrollment_number, course_id, current_semester
        FROM students
        WHERE id = ${studentId}
      `
      if (studentResult.length === 0) {
        return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
      }
      student = studentResult[0]
    }

    // Get fee structure for the student's course up to current semester
    const feeStructure = await sql`
      SELECT 
        fs.semester,
        fs.semester_fee,
        fs.exam_fee,
        c.name as course_name
      FROM fee_structure fs
      JOIN courses c ON fs.course_id = c.id
      WHERE fs.course_id = ${student.course_id}
        AND fs.semester <= ${student.current_semester}
      ORDER BY fs.semester ASC
    `

    // Get all payments for this student
    const payments = await sql`
      SELECT 
        fp.*,
        ap.full_name as processed_by
      FROM fee_payments fp
      LEFT JOIN admin_personnel ap ON fp.accounts_personnel_id = ap.id
      WHERE fp.student_id = ${student.id}
      ORDER BY fp.semester ASC, fp.created_at DESC
    `

    // Calculate totals
    const totalFees = feeStructure.reduce(
      (acc, fs: any) => acc + Number(fs.semester_fee) + Number(fs.exam_fee),
      0
    )
    const totalPaid = payments.reduce((acc, p: any) => acc + Number(p.amount_paid), 0)
    const totalRemaining = totalFees - totalPaid

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.full_name,
        enrollmentNumber: student.enrollment_number,
        courseId: student.course_id,
        currentSemester: student.current_semester,
      },
      feeStructure,
      payments,
      summary: {
        totalFees,
        totalPaid,
        totalRemaining,
      },
    })
  } catch (error) {
    console.error("[Fee Payments API] Error fetching payments:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch payment records" }, { status: 500 })
  }
}

// POST: Add a new payment record
export async function POST(request: NextRequest) {
  const personnelAuth = await validateAccountsPersonnelAuth(request)
  const adminAuth = await validateAdminAuth(request)

  if (!personnelAuth.success && !adminAuth.success) {
    return createAccountsPersonnelUnauthorizedResponse("Unauthorized access")
  }

  try {
    const body = await request.json()
    const { studentId, semester, feeType, amountPaid, paymentDate, transactionId, notes } = body

    if (!studentId || !semester || !feeType || !amountPaid || !paymentDate || !transactionId) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    if (amountPaid <= 0) {
      return NextResponse.json({ success: false, message: "Payment amount must be positive" }, { status: 400 })
    }

    if (!["semester", "exam", "both"].includes(feeType)) {
      return NextResponse.json({ success: false, message: "Invalid fee type" }, { status: 400 })
    }

    // Get student details
    const studentResult = await sql`
      SELECT id, course_id, current_semester
      FROM students
      WHERE id = ${studentId}
    `

    if (studentResult.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const student = studentResult[0]

    // Check if semester is valid for this student
    if (semester > student.current_semester) {
      return NextResponse.json(
        { success: false, message: "Cannot record payment for future semesters" },
        { status: 400 }
      )
    }

    // Get fee structure for this semester
    const feeStructureResult = await sql`
      SELECT semester_fee, exam_fee
      FROM fee_structure
      WHERE course_id = ${student.course_id} AND semester = ${semester}
    `

    if (feeStructureResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Fee structure not defined for this semester" },
        { status: 400 }
      )
    }

    const feeStructure = feeStructureResult[0]

    // Calculate max allowed payment for this semester and fee type
    let maxAllowed = 0
    if (feeType === "semester") {
      maxAllowed = Number(feeStructure.semester_fee)
    } else if (feeType === "exam") {
      maxAllowed = Number(feeStructure.exam_fee)
    } else if (feeType === "both") {
      maxAllowed = Number(feeStructure.semester_fee) + Number(feeStructure.exam_fee)
    }

    // Check existing payments for this semester and fee type
    const existingPayments = await sql`
      SELECT COALESCE(SUM(amount_paid), 0) as total_paid
      FROM fee_payments
      WHERE student_id = ${studentId}
        AND semester = ${semester}
        AND (fee_type = ${feeType} OR fee_type = 'both' OR ${feeType} = 'both')
    `

    const alreadyPaid = Number(existingPayments[0].total_paid)
    const remainingAllowed = maxAllowed - alreadyPaid

    if (amountPaid > remainingAllowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Payment amount exceeds remaining balance. Already paid: ${alreadyPaid}, Maximum allowed: ${maxAllowed}, Remaining: ${remainingAllowed}`,
        },
        { status: 400 }
      )
    }

    // Check if transaction ID already exists
    const transactionCheck = await sql`
      SELECT id FROM fee_payments WHERE transaction_id = ${transactionId}
    `

    if (transactionCheck.length > 0) {
      return NextResponse.json(
        { success: false, message: "Transaction ID already exists" },
        { status: 409 }
      )
    }

    const personnelId = personnelAuth.success ? personnelAuth.personnel?.id : null

    // Insert payment record
    const result = await sql`
      INSERT INTO fee_payments (
        student_id, semester, fee_type, amount_paid, payment_date, 
        transaction_id, accounts_personnel_id, notes
      )
      VALUES (
        ${studentId}, ${semester}, ${feeType}, ${amountPaid}, ${paymentDate},
        ${transactionId}, ${personnelId}, ${notes || null}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      payment: result[0],
      message: "Payment recorded successfully",
    })
  } catch (error: any) {
    console.error("[Fee Payments API] Error recording payment:", error)
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Transaction ID already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ success: false, message: "Failed to record payment" }, { status: 500 })
  }
}
