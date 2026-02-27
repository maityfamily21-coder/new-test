import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import jsPDF from "jspdf"
import QRCode from "qrcode"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { examId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId || !params.examId) {
      return NextResponse.json({ error: "Missing studentId or examId" }, { status: 400 })
    }

    // --- Fetch Student Details ---
    const studentResult = await sql`
      SELECT 
        s.id, s.full_name, s.enrollment_number, s.phone_number,
        s.current_semester, c.name as course_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = ${Number.parseInt(studentId)}
    `
    const student = studentResult?.[0]
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    // --- Fetch Exam & Subject Details ---
    const examResult = await sql`
      SELECT e.id, e.exam_name, e.exam_date,
      COALESCE(json_agg(
        json_build_object(
          'subject_id', es.subject_id,
          'subject_name', s.name,
          'subject_code', s.code,
          'total_marks', es.total_marks,
          'exam_date', es.exam_date,
          'exam_end_time', es.exam_end_time
        )
        ORDER BY es.exam_date ASC
      ) FILTER (WHERE es.subject_id IS NOT NULL), '[]'::json) as subjects
      FROM exams e
      LEFT JOIN exam_subjects es ON e.id = es.exam_id
      LEFT JOIN subjects s ON es.subject_id = s.id
      WHERE e.id = ${Number.parseInt(params.examId)}
      GROUP BY e.id
    `
    const exam = examResult?.[0]
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    // --- Fetch QR Tokens ---
    const qrTokens = await sql`
      SELECT subject_id, token FROM exam_qr_tokens
      WHERE exam_id = ${Number.parseInt(params.examId)} AND student_id = ${Number.parseInt(studentId)}
    `

    const qrMap = new Map<number, string>()
    for (const qrToken of qrTokens || []) {
      const qrCode = await QRCode.toDataURL(qrToken.token, {
        errorCorrectionLevel: "H",
        type: "image/png",
        quality: 0.95,
        margin: 1,
        width: 110,
      })
      qrMap.set(qrToken.subject_id, qrCode)
    }

    // --- PDF Setup ---
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageWidth = 210
    const pageHeight = 297
    const margin = 10
    let yPos = 15

    // --- HEADER ---
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(22)
    pdf.setTextColor(0, 80, 160)
    pdf.text("GUJARAT UNIVERSITY", pageWidth / 2, yPos, { align: "center" })

    yPos += 7
    pdf.setFontSize(14)
    pdf.setTextColor(150, 0, 80)
    pdf.text("CENTRE FOR PROFESSIONAL COURSES", pageWidth / 2, yPos, { align: "center" })

    yPos += 6
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    pdf.setTextColor(80, 80, 80)
    pdf.text(
      "Maharshri Aryabhat Bhavan, Opposite EMRC Building, Gujarat University Campus, Navrangpura, Ahmedabad, Gujarat 380009.",
      pageWidth / 2,
      yPos,
      { align: "center" },
    )

    // --- TITLE ---
    yPos += 10
    pdf.setDrawColor(0, 80, 160)
    pdf.setLineWidth(0.5)
    pdf.rect(margin, yPos - 6, pageWidth - margin * 2, 10, "S")
    pdf.setFontSize(12)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(0, 0, 0)
    pdf.text("EXAMINATION HALL ADMIT CARD", pageWidth / 2, yPos + 1, { align: "center" })

    // --- STUDENT DETAILS ---
    yPos += 12
    pdf.setDrawColor(200)
    pdf.rect(margin, yPos, pageWidth - margin * 2, 36)
    yPos += 6

    const leftX = margin + 4
    const rightX = pageWidth / 2 + 12
    const addRow = (label: string, value: string, right?: boolean) => {
      const x = right ? rightX : leftX
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9)
      pdf.text(`${label}:`, x, yPos)
      pdf.setFont("helvetica", "normal")
      pdf.text(value || "-", x + 35, yPos)
      if (right) yPos += 5
    }

    const examDate = new Date(exam.exam_date)
    const monthName = examDate.toLocaleString("en-US", { month: "long" })

    addRow("Program", student.course_name)
    addRow("Academic Year", "2025-2026", true)
    addRow("Candidate Name", student.full_name)
    addRow("Month of Examination", monthName, true)
    addRow("Enrollment Number", student.enrollment_number)
    addRow("Semester", String(student.current_semester), true)
    addRow("Mobile Number", student.phone_number)

    // --- SUBJECT TABLE ---
    yPos += 8
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(9)
    pdf.setFillColor(230, 240, 255)

    const headers = ["Date", "Time", "Code", "Subject", "Marks", "QR Code", "Invigilator"]
    const colWidths = [22, 26, 20, 55, 18, 25, 24]
    const headerHeight = 9

    let x = margin
    pdf.rect(x, yPos, 190, headerHeight, "F")
    headers.forEach((h, i) => {
      pdf.rect(x, yPos, colWidths[i], headerHeight)
      pdf.text(h, x + 2, yPos + 6)
      x += colWidths[i]
    })
    yPos += headerHeight

    // --- Dynamic Layout Adjustments ---
    const subjectCount = exam.subjects.length
    const availableHeight = pageHeight - yPos - 60 // keep bottom for footer
    const rowHeight = availableHeight / subjectCount
    const qrSize = 16 // fixed 16x16 size

    // --- SUBJECT ROWS ---
    pdf.setFont("helvetica", "normal")
    exam.subjects.forEach((sub: any) => {
      const start = new Date(sub.exam_date)
      const end = new Date(sub.exam_end_time)
      const dateStr = start.toLocaleDateString("en-GB")
      const timeStr = `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`

      const values = [dateStr, timeStr, sub.subject_code, sub.subject_name, String(sub.total_marks), "", ""]
      let colX = margin

      values.forEach((v, i) => {
        pdf.rect(colX, yPos, colWidths[i], rowHeight)
        if (i === 5) {
          const qr = qrMap.get(sub.subject_id)
          if (qr)
            pdf.addImage(
              qr,
              "PNG",
              colX + (colWidths[i] - qrSize) / 2,
              yPos + (rowHeight - qrSize) / 2,
              qrSize,
              qrSize,
            )
        } else {
          pdf.text(String(v || "-"), colX + 2, yPos + rowHeight / 2 + 2, { maxWidth: colWidths[i] - 4 })
        }
        colX += colWidths[i]
      })
      yPos += rowHeight
    })

    // --- INSTRUCTIONS ---
    yPos += 4
    pdf.setFont("helvetica", "bold")
    pdf.text("Instructions:", margin, yPos)
    yPos += 4
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    const instructions = [
      "• Students must carry this hall ticket to enter the examination center.",
      "• Candidate must report 15 minutes before exam time.",
      "• Entry to the hall will be closed after the scheduled time.",
      "• Seating arrangement will be displayed before the exam.",
      "• Follow all invigilator and university instructions strictly.",
    ]
    instructions.forEach((inst) => {
      pdf.text(inst, margin + 2, yPos)
      yPos += 3.5
    })

    // --- FOOTER ---
    yPos = pageHeight - 15
    pdf.setFontSize(9)
    pdf.text("Student's Signature", margin + 5, yPos)
    pdf.text("Controller of Examination", pageWidth - margin - 60, yPos)

    // --- OUTPUT ---
    const buffer = Buffer.from(pdf.output("arraybuffer"))
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Hall_Ticket_${student.enrollment_number}_${exam.exam_name}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Error generating hall ticket:", err)
    return NextResponse.json({ error: "Failed to generate hall ticket" }, { status: 500 })
  }
}
