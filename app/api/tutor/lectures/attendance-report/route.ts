export const runtime = 'nodejs'

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {

  try {

    const { subjectId, tutorId, fromDate, toDate } = await request.json()

    /* ================= DATABASE ================= */

    const tutorInfo = await sql`
      SELECT name, department
      FROM tutors
      WHERE id = ${tutorId}
    `

    const subjectInfo = await sql`
      SELECT s.name, s.code, s.course_id, s.semester, c.name as course_name
      FROM subjects s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ${parseInt(subjectId)}
    `

    const lectures = await sql`
      SELECT id, title, lecture_date
      FROM lectures
      WHERE subject_id = ${parseInt(subjectId)}
      AND tutor_id = ${tutorId}
      AND DATE(lecture_date)
      BETWEEN ${fromDate} AND ${toDate}
      ORDER BY lecture_date ASC
    `

    const students = await sql`
      SELECT id
      FROM students
      WHERE course_id = ${subjectInfo[0].course_id}
      AND current_semester = ${subjectInfo[0].semester}
    `

    let attendanceData: any[] = []

    if (lectures.length > 0) {

      const lectureIds = lectures.map(l => l.id)

      attendanceData = await sql`
    SELECT lecture_id, status
    FROM lecture_attendance
    WHERE lecture_id = ANY(${lectureIds})
  `

    }

    /* ================= PDF ================= */

    const pdfDoc = await PDFDocument.create()

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const page = pdfDoc.addPage([595, 842])

    let y = 800

    page.drawText("Visiting Tutor Payment Voucher Report", {
      x: 120,
      y,
      size: 18,
      font: fontBold
    })

    y -= 40

    page.drawText(`Tutor: ${tutorInfo[0]?.name || "N/A"}`, {
      x: 50,
      y,
      size: 12,
      font: fontRegular
    })

    y -= 20

    page.drawText(`Course: ${subjectInfo[0]?.course_name || "N/A"}`, {
      x: 50,
      y,
      size: 12,
      font: fontRegular
    })

    y -= 20

    page.drawText(`Subject: ${subjectInfo[0]?.name || "N/A"}`, {
      x: 50,
      y,
      size: 12,
      font: fontRegular
    })

    y -= 20

    page.drawText(`Date Range: ${fromDate} to ${toDate}`, {
      x: 50,
      y,
      size: 12,
      font: fontRegular
    })

    y -= 40

    page.drawText("LECTURE TOPICS:", {
      x: 50,
      y,
      size: 14,
      font: fontBold
    })

    y -= 25

    let currentPage = page

    for (const lecture of lectures) {

      if (y < 50) {
        currentPage = pdfDoc.addPage([595, 842])
        y = 800
      }

      const presentCount =
        attendanceData.filter(
          a => a.lecture_id === lecture.id && a.status === "Present"
        ).length

      currentPage.drawText(
        `${new Date(lecture.lecture_date).toLocaleDateString()}  (${presentCount}/${students.length})  ${lecture.title}`,
        {
          x: 50,
          y,
          size: 10,
          font: fontRegular
        }
      )

      y -= 18
    }

    y -= 40

    page.drawText("Signature:", {
      x: 50,
      y,
      size: 12,
      font: fontBold
    })

    y -= 20

    page.drawText(tutorInfo[0]?.name || "N/A", {
      x: 50,
      y,
      size: 12,
      font: fontRegular
    })

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {

      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=attendance-report.pdf"
      }

    })

  }


  catch (error) {

    console.error(error)

    return Response.json({

      success: false,
      error: "PDF generation failed"

    }, { status: 500 })

  }

}