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
    const enrollment = searchParams.get("enrollment")
    const uniqueCode = searchParams.get("uniqueCode")
    const transactionId = searchParams.get("transactionId")

    // Build search query based on search type
    let studentResult
    
    if (transactionId) {
      // Search by transaction ID - find student from payment history
      console.log("[v0] Searching by transaction ID:", transactionId)
      const paymentResult = await sql`
        SELECT DISTINCT
          s.id,
          s.full_name,
          s.enrollment_number,
          s.course_id,
          s.current_semester,
          c.name as course_name
        FROM students s
        INNER JOIN courses c ON c.id = s.course_id
        INNER JOIN fee_payments fp ON fp.student_id = s.id
        WHERE fp.transaction_id = ${transactionId}
      `
      studentResult = paymentResult
    } else if (uniqueCode) {
      // Search by unique code
      console.log("[v0] Searching by unique code:", uniqueCode)
      const uniqueResult = await sql`
        SELECT 
          s.id,
          s.full_name,
          s.enrollment_number,
          s.course_id,
          s.current_semester,
          c.name as course_name
        FROM students s
        INNER JOIN courses c ON c.id = s.course_id
        WHERE s.unique_code = ${uniqueCode}
      `
      studentResult = uniqueResult
    } else if (enrollment) {
      // Search by enrollment number (default)
      console.log("[v0] Searching by enrollment:", enrollment)
      const enrollmentResult = await sql`
        SELECT 
          s.id,
          s.full_name,
          s.enrollment_number,
          s.course_id,
          s.current_semester,
          c.name as course_name
        FROM students s
        INNER JOIN courses c ON c.id = s.course_id
        WHERE s.enrollment_number = ${enrollment}
      `
      studentResult = enrollmentResult
    } else {
      return NextResponse.json({ error: "Please provide enrollment number, unique code, or transaction ID" }, { status: 400 })
    }

    if (studentResult.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const student = studentResult[0]

    // Get fee structure for all semesters up to current semester
    const feeStructureResult = await sql`
      SELECT 
        fs.semester,
        fs.semester_fee,
        fs.exam_fee,
        COALESCE(SUM(CASE WHEN fp.fee_type IN ('semester', 'both') THEN fp.amount_paid ELSE 0 END), 0) as semester_paid,
        COALESCE(SUM(CASE WHEN fp.fee_type IN ('exam', 'both') THEN fp.amount_paid ELSE 0 END), 0) as exam_paid
      FROM fee_structure fs
      LEFT JOIN fee_payments fp ON fp.student_id = ${student.id} AND fp.semester = fs.semester
      WHERE fs.course_id = ${student.course_id} AND fs.semester <= ${student.current_semester}
      GROUP BY fs.semester, fs.semester_fee, fs.exam_fee
      ORDER BY fs.semester
    `

    const feeDetails = feeStructureResult.map((row: any) => ({
      semester: row.semester,
      semester_fee: Number(row.semester_fee),
      exam_fee: Number(row.exam_fee),
      semester_paid: Number(row.semester_paid),
      exam_paid: Number(row.exam_paid),
      semester_pending: Math.max(0, Number(row.semester_fee) - Number(row.semester_paid)),
      exam_pending: Math.max(0, Number(row.exam_fee) - Number(row.exam_paid)),
    }))

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.full_name,
        enrollment_number: student.enrollment_number,
        course_name: student.course_name,
        current_semester: student.current_semester,
      },
      feeDetails,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Student fees fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
