export const runtime = 'nodejs'

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { neon } from "@neondatabase/serverless"
import fs from 'fs'
import path from 'path'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {

  try {

    const { subjectId, tutorId, fromDate, toDate } = await request.json()

    /* ================= DATABASE ================= */

    const tutorInfo = await sql`
      SELECT 
        name,
        department,
        pan_number,
        aadhar_card_no,
        bank_name,
        ifsc_code,
        name_as_per_bank,
        account_number
      FROM tutors
      WHERE id = ${tutorId}
    `

    const subjectInfo = await sql`
      SELECT s.name, s.code, s.course_id, s.semester, c.name as course_name,
      (SELECT a.username FROM admins a 
       JOIN admin_course_assignments aca ON a.id = aca.admin_id 
       WHERE aca.course_id = c.id LIMIT 1) as admin_name
      FROM subjects s 
      JOIN courses c ON s.course_id = c.id 
      WHERE s.id = ${parseInt(subjectId)}
    `

    const lectures = await sql`
      SELECT id, title, lecture_date
      FROM lectures
      WHERE subject_id = ${parseInt(subjectId)}
      AND tutor_id = ${tutorId}
      AND DATE(lecture_date) BETWEEN ${fromDate} AND ${toDate}
      ORDER BY lecture_date ASC
    `

    const students = await sql`
      SELECT id, full_name
      FROM students
      WHERE course_id = ${subjectInfo[0].course_id}
      AND current_semester = ${subjectInfo[0].semester}
      ORDER BY full_name ASC
    `

    /* SAFE attendance query */
    let attendanceData: any[] = []

    if (lectures.length > 0) {

      const lectureIds = lectures.map(l => l.id)

      attendanceData = await sql`
        SELECT lecture_id, student_id, status
        FROM lecture_attendance
        WHERE lecture_id = ANY(${lectureIds})
      `
    }

    const attMap = new Map(
      attendanceData.map(
        r => [`${r.lecture_id}-${r.student_id}`, r.status]
      )
    )

    /* ================= PDF SETUP ================= */

    const pdfDoc = await PDFDocument.create()

    const fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Courier)

    const black = rgb(0, 0, 0)

    const loadImg = (name: string) => {

      const p = path.join(process.cwd(), 'public', 'images', name)

      return fs.existsSync(p) ? fs.readFileSync(p) : null
    }

    const guLogo = loadImg('gujarat-university-logo.png')
    const gucpcLogo = loadImg('gucpc-logo.png')
    const samanvayLogo = loadImg('samanvay-logo.png')

    const guWatermark = guLogo
      ? await pdfDoc.embedPng(guLogo)
      : null

    const drawWatermark = (page: any, width: number, height: number) => {

      if (!guWatermark) return

      page.drawImage(guWatermark, {
        x: width / 2 - 170,
        y: height / 2 - 170,
        width: 340,
        height: 340,
        opacity: 0.08
      })
    }

    /* ================= PAGE 1 ================= */

    const page1 = pdfDoc.addPage([612, 792])

    const { width, height } = page1.getSize()

    page1.drawRectangle({
      x: 30, y: 30, width: 552, height: 732,
      borderWidth: 1.5, borderColor: black
    })

    drawWatermark(page1, width, height)

    if (guLogo)
      page1.drawImage(await pdfDoc.embedPng(guLogo),
        { x: 45, y: height - 85, width: 45, height: 45 })

    if (gucpcLogo)
      page1.drawImage(await pdfDoc.embedPng(gucpcLogo),
        { x: 265, y: height - 80, width: 80, height: 35 })

    if (samanvayLogo)
      page1.drawImage(await pdfDoc.embedPng(samanvayLogo),
        { x: 520, y: height - 85, width: 45, height: 45 })

    const address =
      "Centre for Professional Courses, Maharshi Aryabhatt Bhawan, Gujarat University Campus, Ahmedabad, Gujarat 380009"

    const addressWidth =
      fontBold.widthOfTextAtSize(address, 7)

    page1.drawText(address, {
      x: 30 + (552 - addressWidth) / 2,
      y: height - 95,
      size: 7,
      font: fontBold
    })

    page1.drawLine({
      start: { x: 30, y: height - 110 },
      end: { x: 582, y: height - 110 },
      thickness: 1.2
    })

    page1.drawText(
      'Visiting Tutor Payment Voucher Report',
      { x: 155, y: height - 130, size: 13, font: fontBold }
    )

    page1.drawLine({
      start: { x: 30, y: height - 145 },
      end: { x: 582, y: height - 145 },
      thickness: 1.2
    })

    let y = height - 175

    const drawField = (label: string, value: string, yy: number) => {

      page1.drawText(label, { x: 50, y: yy, size: 10, font: fontBold })

      page1.drawText(` : ${value || '—'}`,
        { x: 150, y: yy, size: 10, font: fontRegular })
    }

    drawField("Tutor Name", tutorInfo[0].name, y)
    drawField("Department", tutorInfo[0].department, y - 16)
    drawField("Course", subjectInfo[0].course_name, y - 32)
    drawField("Semester", String(subjectInfo[0].semester), y - 48)
    drawField("Subject", `${subjectInfo[0].name} [${subjectInfo[0].code}]`, y - 64)
    drawField("Date Range", `${fromDate} to ${toDate}`, y - 80)

    y -= 120

    drawField("PAN Card No", tutorInfo[0].pan_number, y)
    drawField("Aadhaar No", tutorInfo[0].aadhar_card_no, y - 16)
    drawField("Bank Name", tutorInfo[0].bank_name, y - 32)
    drawField("IFSC Code", tutorInfo[0].ifsc_code, y - 48)
    drawField("Account No", tutorInfo[0].account_number, y - 64)

    /* ================= LECTURE TOPICS ================= */

    let topicPage = page1
    let topicY = y - 110

    topicPage.drawText("LECTURE TOPICS CONDUCTED:",
      { x: 50, y: topicY, size: 11, font: fontBold })

    topicY -= 25

    for (const l of lectures) {

      if (topicY < 120) {

        topicPage = pdfDoc.addPage([612, 792])

        topicPage.drawRectangle({
          x: 30, y: 30, width: 552, height: 732,
          borderWidth: 1.5, borderColor: black
        })

        drawWatermark(topicPage, width, height)

        topicY = height - 80
      }

      const start = new Date(l.lecture_date)

      const end = new Date(start.getTime() + 55 * 60000)

      const presentCount =
        attendanceData.filter(
          a => a.lecture_id === l.id &&
            a.status === 'Present'
        ).length

      topicPage.drawText(
        `${start.toLocaleDateString('en-GB')} (${presentCount}/${students.length}) - ${l.title}`,
        { x: 50, y: topicY, size: 9, font: fontRegular }
      )

      topicY -= 18
    }

    /* ================= ATTENDANCE GRID ================= */

    const LECTURES_PER_PAGE = 15

    for (let i = 0; i < lectures.length; i += LECTURES_PER_PAGE) {

      const chunk = lectures.slice(i, i + LECTURES_PER_PAGE)

      let gridPage = pdfDoc.addPage([612, 792])

      gridPage.drawRectangle({
        x: 30, y: 30, width: 552, height: 732,
        borderWidth: 1.5, borderColor: black
      })

      drawWatermark(gridPage, width, height)

      let gy = height - 80

      gridPage.drawText(
        "ATTENDANCE REGISTER GRID",
        { x: 50, y: gy, size: 12, font: fontBold }
      )

      gy -= 30

      let header = "Student Name".padEnd(25)

      chunk.forEach(l => {

        const d = new Date(l.lecture_date)
        header += `| ${d.getDate()} `
      })

      gridPage.drawText(header,
        { x: 50, y: gy, size: 8, font: fontRegular })

      gy -= 20

      for (const s of students) {

        if (gy < 50) {

          gridPage = pdfDoc.addPage([612, 792])

          drawWatermark(gridPage, width, height)

          gy = height - 80
        }

        let row = s.full_name.substring(0, 22).padEnd(25)

        chunk.forEach(l => {

          row += `| ${attMap.get(`${l.id}-${s.id}`)
              === 'Present' ? 'P' : 'A'
            } `
        })

        gridPage.drawText(row,
          { x: 50, y: gy, size: 8, font: fontRegular })

        gy -= 15
      }
    }

    /* ================= SAVE ================= */

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          "attachment; filename=Attendance_Report.pdf"
      }
    })

  }

  catch (error) {

    console.error(error)

    return Response.json(
      { success: false },
      { status: 500 }
    )
  }
}