import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import jsPDF from "jspdf"
import QRCode from "qrcode"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { examId: string } }) {
  try {
    const examIdNum = Number.parseInt(params.examId, 10)

    // --- Fetch Exam Details ---
    const examResult = await sql`
      SELECT e.id, e.exam_name, e.exam_date, e.course_id, e.semester,
        c.name as course_name,
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
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.id = ${examIdNum}
      GROUP BY e.id, e.exam_name, e.exam_date, e.course_id, e.semester, c.name, c.id
    `

    const exam = examResult?.[0]
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    const studentsResult = await sql`
      SELECT s.id, s.full_name, s.enrollment_number, s.phone_number,
             s.current_semester, c.name as course_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.course_id = ${exam.course_id} AND s.current_semester = ${exam.semester}
    `

    if (!studentsResult?.length)
      return NextResponse.json({ error: "No students found for this exam" }, { status: 404 })

    // --- Create PDF ---
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageWidth = 210
    const pageHeight = 297
    const margin = 10
    let firstPage = true

    for (const student of studentsResult) {
      if (!firstPage) pdf.addPage()
      firstPage = false
      let yPos = 15

      // --- Fetch QR Tokens ---
      const qrTokens = await sql`
        SELECT subject_id, token FROM exam_qr_tokens
        WHERE exam_id = ${examIdNum} AND student_id = ${student.id}
      `

      const qrMap = new Map<number, string>()
      for (const qrToken of qrTokens || []) {
        const qrCode = await QRCode.toDataURL(qrToken.token, {
          errorCorrectionLevel: "H",
          type: "image/png",
          quality: 1,
          margin: 0,
        })
        qrMap.set(qrToken.subject_id, qrCode)
      }

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
        "Maharshri Aryabhat Bhavan, Opp. EMRC Building, Gujarat University Campus, Navrangpura, Ahmedabad - 380009",
        pageWidth / 2,
        yPos,
        { align: "center" },
      )

      // --- TITLE BOX ---
      yPos += 10
      pdf.setDrawColor(0, 80, 160)
      pdf.setLineWidth(0.6)
      pdf.rect(margin, yPos - 6, pageWidth - margin * 2, 10, "S")
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text("EXAMINATION HALL ADMIT CARD", pageWidth / 2, yPos + 1, { align: "center" })

      // --- STUDENT DETAILS BOX ---
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
      const colWidths = [22, 26, 20, 55, 18, 27, 22]
      const headerHeight = 9
      const subjectCount = exam.subjects.length
      const rowHeight = subjectCount >= 8 ? 20 : 22

      let x = margin
      pdf.rect(x, yPos, 190, headerHeight, "F")
      headers.forEach((h, i) => {
        pdf.rect(x, yPos, colWidths[i], headerHeight)
        pdf.text(h, x + 2, yPos + 6)
        x += colWidths[i]
      })
      yPos += headerHeight

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
            if (qr) {
              // ✅ Slightly smaller QR (16x16)
              pdf.addImage(qr, "PNG", colX + 5, yPos + 3, 16, 16)
            }
          } else {
            pdf.text(String(v || "-"), colX + 2, yPos + 11, { maxWidth: colWidths[i] - 4 })
          }
          colX += colWidths[i]
        })
        yPos += rowHeight
      })

      // --- INSTRUCTIONS ---
      yPos += 5
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

      // --- SIGNATURES (BOTTOM, FULL PAGE UTILIZATION) ---
      yPos = pageHeight - 25
      pdf.setFontSize(9)
      pdf.text("Student's Signature", margin + 5, yPos)
      pdf.text("Controller of Examination", pageWidth - margin - 60, yPos)
    }

    // --- OUTPUT PDF ---
    const buffer = Buffer.from(pdf.output("arraybuffer"))
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Hall_Tickets_${exam.course_name}_Sem${exam.semester}.pdf"`,
      },
    })
  } catch (err) {
    console.error("[MYT] Error generating hall tickets:", err)
    return NextResponse.json(
      { error: `Failed to generate hall tickets: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
