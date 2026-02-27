import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

let qrDDLEnsured = false
async function ensureQrDDL() {
  if (qrDDLEnsured) return
  await sql`
    CREATE TABLE IF NOT EXISTS student_qr_tokens (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  qrDDLEnsured = true
}

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params
    const decodedToken = decodeURIComponent(token).trim()

    console.log("[MYT] QR Lookup - Raw token:", token)
    console.log("[MYT] QR Lookup - Decoded token:", decodedToken)
    console.log("[MYT] QR Lookup - Token length:", decodedToken.length)

    await ensureQrDDL()

    // First, check if token exists in exam_qr_tokens
    console.log("[MYT] Checking exam_qr_tokens table...")
    const examTokenCheck = await sql`
      SELECT exam_id, student_id, subject_id FROM exam_qr_tokens 
      WHERE token = ${decodedToken} 
      LIMIT 1
    `

    console.log("[MYT] Exam token check result:", examTokenCheck?.length > 0 ? "FOUND" : "NOT FOUND")
    if (examTokenCheck && examTokenCheck.length > 0) {
      console.log("[MYT] Exam token data:", JSON.stringify(examTokenCheck[0]))
    }

    // Full exam QR query with all validations
    const examQRResult = await sql`
      SELECT 
        eqt.exam_id,
        eqt.student_id,
        eqt.subject_id,
        eqt.qr_data,
        s.full_name,
        s.enrollment_number,
        s.course_id,
        c.name as course_name,
        s.current_semester,
        subj.name as subject_name,
        subj.code as subject_code,
        e.exam_name
      FROM exam_qr_tokens eqt
      JOIN students s ON s.id = eqt.student_id
      JOIN exams e ON e.id = eqt.exam_id
      JOIN exam_subjects es ON e.id = es.exam_id AND eqt.subject_id = es.subject_id
      JOIN subjects subj ON subj.id = eqt.subject_id
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE eqt.token = ${decodedToken}
      LIMIT 1
    `

    console.log("[MYT] Exam QR query result:", examQRResult?.length > 0 ? "FOUND" : "NOT FOUND")

    if (examQRResult && examQRResult.length > 0) {
      const row = examQRResult[0]
      console.log("[MYT] Returning exam QR data for student:", row.full_name)

      return NextResponse.json({
        success: true,
        type: "exam",
        student: {
          id: row.student_id,
          name: row.full_name,
          enrollmentNumber: row.enrollment_number,
          course: row.course_name,
          courseId: row.course_id,
          semester: row.current_semester,
          examId: row.exam_id,
          subjectId: row.subject_id,
          subjectName: row.subject_name,
          subjectCode: row.subject_code,
          examName: row.exam_name,
        },
      })
    }

    console.log("[MYT] Token not found in exam_qr_tokens, checking student_qr_tokens...")

    // Fallback to student general QR tokens
    const studentQRResult = await sql`
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        s.course_id,
        c.name as course_name,
        s.current_semester
      FROM student_qr_tokens sqt
      JOIN students s ON s.id = sqt.student_id
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE sqt.token = ${decodedToken}
      LIMIT 1
    `

    console.log("[MYT] Student QR query result:", studentQRResult?.length > 0 ? "FOUND" : "NOT FOUND")

    if (studentQRResult && studentQRResult.length > 0) {
      const row = studentQRResult[0]
      console.log("[MYT] Returning student general QR data for:", row.full_name)
      return NextResponse.json({
        success: true,
        type: "student",
        student: {
          id: row.id,
          name: row.full_name,
          enrollmentNumber: row.enrollment_number,
          course: row.course_name,
          courseId: row.course_id,
          semester: row.current_semester,
        },
      })
    }

    console.log("[MYT] Token not found in any table. Token was:", decodedToken)
    console.log("[MYT] Checking if any tokens exist in exam_qr_tokens...")
    const allTokens = await sql`
      SELECT COUNT(*) as count FROM exam_qr_tokens LIMIT 1
    `
    console.log("[MYT] Total exam_qr_tokens in database:", allTokens?.[0]?.count || 0)

    return NextResponse.json(
      { success: false, message: "Invalid QR code - token not found in system" },
      { status: 404 },
    )
  } catch (error) {
    console.error("[MYT] Student QR data error:", error)
    return NextResponse.json({ success: false, message: "Failed to validate QR code" }, { status: 500 })
  }
}
