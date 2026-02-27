import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateStudentAuth } from "@/lib/student-auth-server"

// GET: Fetch fee details for authenticated student
export async function GET(request: NextRequest) {
  // Validate student authentication
  const studentAuth = await validateStudentAuth(request)

  if (!studentAuth.success || !studentAuth.student) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const studentId = studentAuth.student.id

  try {
    // Get student details including course and current semester
    const studentResult = await sql`
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        s.course_id,
        s.current_semester,
        c.name as course_name,
        c.total_semesters
      FROM students s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ${studentId}
    `

    if (studentResult.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const student = studentResult[0]

    // Get fee structure for the student's course up to current semester only
    const feeStructure = await sql`
      SELECT 
        semester,
        semester_fee,
        exam_fee
      FROM fee_structure
      WHERE course_id = ${student.course_id}
        AND semester <= ${student.current_semester}
      ORDER BY semester ASC
    `

    // Get all payments for this student
    const payments = await sql`
      SELECT 
        semester,
        fee_type,
        amount_paid,
        payment_date,
        transaction_id,
        created_at
      FROM fee_payments
      WHERE student_id = ${studentId}
      ORDER BY semester ASC, created_at DESC
    `

    // Calculate semester-wise breakdown
    const semesterBreakdown = feeStructure.map((fs: any) => {
      const semester = fs.semester
      const semesterFee = Number(fs.semester_fee)
      const examFee = Number(fs.exam_fee)
      const totalFee = semesterFee + examFee

      // Get payments for this semester
      const semesterPayments = payments.filter((p: any) => p.semester === semester)
      const totalPaid = semesterPayments.reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0)
      const remaining = totalFee - totalPaid

      // Determine payment status
      const semesterFeePaid = semesterPayments.some(
        (p: any) => p.fee_type === "semester" || p.fee_type === "both"
      )
      const examFeePaid = semesterPayments.some((p: any) => p.fee_type === "exam" || p.fee_type === "both")

      let status = "Pending"
      if (totalPaid >= totalFee) {
        status = "Paid"
      } else if (totalPaid > 0) {
        status = "Partial"
      }

      return {
        semester,
        semesterFee,
        examFee,
        totalFee,
        totalPaid,
        remaining,
        status,
        semesterFeePaid,
        examFeePaid,
        payments: semesterPayments.map((p: any) => ({
          feeType: p.fee_type,
          amount: Number(p.amount_paid),
          paymentDate: p.payment_date,
          transactionId: p.transaction_id,
        })),
      }
    })

    // Calculate overall totals
    const totalFees = semesterBreakdown.reduce((sum, s: any) => sum + s.totalFee, 0)
    const totalPaid = semesterBreakdown.reduce((sum, s: any) => sum + s.totalPaid, 0)
    const totalRemaining = totalFees - totalPaid

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.full_name,
        enrollmentNumber: student.enrollment_number,
        courseName: student.course_name,
        currentSemester: student.current_semester,
        totalSemesters: student.total_semesters,
      },
      summary: {
        totalFees,
        totalPaid,
        totalRemaining,
      },
      semesterBreakdown,
    })
  } catch (error) {
    console.error("[Student Fees API] Error fetching fees:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch fee details" }, { status: 500 })
  }
}
