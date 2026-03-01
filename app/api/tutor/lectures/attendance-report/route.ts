import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { neon } from "@neondatabase/serverless"
import fs from 'fs'
import path from 'path'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { subjectId, tutorId, fromDate, toDate } = await request.json()

    /* ===================== DATA ===================== */
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

    const attendanceData = await sql`
      SELECT la.lecture_id, la.student_id, la.status
      FROM lecture_attendance la
      JOIN lectures l ON la.lecture_id = l.id
      WHERE l.subject_id = ${parseInt(subjectId)}
      AND DATE(l.lecture_date) BETWEEN ${fromDate} AND ${toDate}
    `

    const attMap = new Map(
      attendanceData.map(r => [`${r.lecture_id}-${r.student_id}`, r.status])
    )

    /* ===================== PDF SETUP ===================== */
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

    /* ===== GUJARAT UNIVERSITY WATERMARK ===== */
    const guWatermarkImg = loadImg('gujarat-university-logo.png')
    const guWatermark = guWatermarkImg
      ? await pdfDoc.embedPng(guWatermarkImg)
      : null


    const drawSamanvayWatermark = (page: any) => {
      if (!guWatermark) return

      page.drawImage(guWatermark, {
        x: width / 2 - 170,
        y: height / 2 - 170,
        width: 340,
        height: 340,
        opacity: 0.08,
      })
    }



    /* =====================================================
       ================= PAGE 1 (UNCHANGED) =================
       ===================================================== */

    const page1 = pdfDoc.addPage([612, 792])
    const { width, height } = page1.getSize()

    page1.drawRectangle({
      x: 30, y: 30, width: 552, height: 732,
      borderWidth: 1.5, borderColor: black
    })
    drawSamanvayWatermark(page1)


    if (guLogo) page1.drawImage(await pdfDoc.embedPng(guLogo), { x: 45, y: height - 85, width: 45, height: 45 })
    if (gucpcLogo) page1.drawImage(await pdfDoc.embedPng(gucpcLogo), { x: 265, y: height - 80, width: 80, height: 35 })
    if (samanvayLogo) page1.drawImage(await pdfDoc.embedPng(samanvayLogo), { x: 520, y: height - 85, width: 45, height: 45 })

    const address =
      "Centre for Professional Courses, Maharshi Aryabhatt Bhawan, Gujarat University Campus, Ahmedabad, Gujarat 380009"

    const addressSize = 7
    const addressWidth = fontBold.widthOfTextAtSize(address, addressSize)

    // center between page borders (30 → 582)
    const centerX = 30 + (552 - addressWidth) / 2

    page1.drawText(address, {
      x: centerX,
      y: height - 95,
      size: addressSize,
      font: fontBold,
    })



    page1.drawLine({ start: { x: 30, y: height - 110 }, end: { x: 582, y: height - 110 }, thickness: 1.2 })
    page1.drawText('Visiting Tutor Payment Voucher Report', { x: 155, y: height - 130, size: 13, font: fontBold })
    page1.drawLine({ start: { x: 30, y: height - 145 }, end: { x: 582, y: height - 145 }, thickness: 1.2 })

    let currentY = height - 175

    const drawField = (l: string, v: string, y: number) => {
      page1.drawText(l, { x: 50, y, size: 10, font: fontBold })
      page1.drawText(` : ${v}`, { x: 150, y, size: 10, font: fontRegular })
    }

    const drawAutoField = (
      label: string,
      value: string,
      x: number,
      y: number
    ) => {
      page1.drawText(label, { x, y, size: 10, font: fontBold })
      page1.drawText(` : ${value || '—'}`, {
        x: x + 100,
        y,
        size: 10,
        font: fontRegular
      })
    }

    drawField('Tutor Name', tutorInfo[0].name, currentY)
    drawField('Department', tutorInfo[0].department, currentY - 16)
    drawField('Course', subjectInfo[0].course_name, currentY - 32)
    drawField('Semester', String(subjectInfo[0].semester), currentY - 48)
    drawField('Subject', `${subjectInfo[0].name} [${subjectInfo[0].code}]`, currentY - 64)
    drawField('Date Range', `${fromDate} to ${toDate}`, currentY - 80)


    currentY -= 135

    drawAutoField('PAN Card No', tutorInfo[0].pan_number, 50, currentY)
    drawAutoField('Aadhaar No', tutorInfo[0].aadhar_card_no, 340, currentY)

    drawAutoField('Bank Name', tutorInfo[0].bank_name, 50, currentY - 16)
    drawAutoField('IFSC Code', tutorInfo[0].ifsc_code, 340, currentY - 16)

    drawAutoField('Bank A/C No', tutorInfo[0].account_number, 50, currentY - 32)
    drawAutoField('Name as per Bank', tutorInfo[0].name_as_per_bank, 340, currentY - 32)




    currentY -= 45
    page1.drawLine({ start: { x: 30, y: currentY + 5 }, end: { x: 582, y: currentY + 5 }, thickness: 1 })
    page1.drawText(`Total Lectures Conducted : ${lectures.length}`, { x: 50, y: currentY - 12, size: 10, font: fontBold })

    const totalPossible = students.length * lectures.length
    const totalPresent = attendanceData.filter(r => r.status === 'Present').length
    const overallPercentage = totalPossible > 0 ? ((totalPresent / totalPossible) * 100).toFixed(2) : "0.00"

    page1.drawText(`Overall Present Percentage : ${overallPercentage}%`, {
      x: 340, y: currentY - 12, size: 10, font: fontBold
    })

    page1.drawText(`Manual Calculation: ____ * (${lectures.length}) = ______`, {
      x: 50, y: currentY - 30, size: 10, font: fontBold
    })

    page1.drawLine({ start: { x: 30, y: currentY - 40 }, end: { x: 582, y: currentY - 40 }, thickness: 1 })

    currentY -= 65
    page1.drawText('LECTURE TOPICS CONDUCTED:', {
      x: 50, y: currentY, size: 11, font: fontBold
    })

    currentY -= 30

    /* ===== LECTURE TOPICS PAGINATION (ADDED) ===== */
    let topicPage = page1
    let topicY = currentY

    for (const l of lectures) {
      if (topicY < 120) {
        topicPage = pdfDoc.addPage([612, 792])
        topicPage.drawRectangle({
          x: 30, y: 30, width: 552, height: 732,
          borderWidth: 1.5, borderColor: black
        })
        drawSamanvayWatermark(topicPage)
        topicY = height - 80
        topicPage.drawText('LECTURE TOPICS CONDUCTED (Continued):', {
          x: 50, y: topicY, size: 11, font: fontBold
        })
        topicY -= 30
      }

      const start = new Date(l.lecture_date)

      // ===== ONLY FOR DCS-C-VC-362P2 =====
      const FOUR_HOUR_SUBJECT_CODES = [
        'DCS-C-VC-362P2',
        'DSC-C-DF-111P',
        'DSC-C-DF-112P',
        'DSC-M-DF-113P1',
        'DSC-M-DF-113P2',
        'MDC-DF-114P',
        'DSC-C-ISD-231P',
        'DSC-C-ISD-232P',
        'DSC-C-ISD-233P1',
        'DSC-C-ISD-233P2',
        'MDC-ISD-234P1',
        'MDC-ISD-234P2',
        'DSC-C-ISD-351P',
        'DSC-C-ISD-352P',
        'DSC-C-ISD-353P',
        'DSC-M-ISD-354P1',
        'DSC-M-ISD-354P2',
        'DSC-M-ISD-355P',
        'IS701',
        'IS702',
        'IS703',
        'IS704',
        'DSC-C-DF-121P',
        'DSC-C-DF-122P',
        'DSC-M-DES-123P',
        'MDC-DES-124P1',
        'MDC-DES-124P2',
        'DCS-C-I&SD-241P',
        'DCS-C-I&SD-242P',
        'DCS-C-I&SD-243P1',
        'DCS-C-I&SD-243P2',
        'DCS-M-I&SD-244P1',
        'DCS-M-I&SD-244P2',
        'DSC-C-IS-361P1',
        'DSC-C-IS-362P',
        'DSC-C-IS-361P2',
        'DSC-C-IS-363P1',
        'DSC-C-IS-364',
        'DSC-C-IS-363P2',
        'INTERNSHIP',
        'IS801',
        'IS802',
        '001',
        'DSC-C-FC-231P',
        'DSC-C-FC-232P',
        'DSC-C-FC-233P1',
        'DSC-C-FC-233P2',
        'MDC-FC-234P1',
        'MDC-FC-234P2',
        'DSC-C-FC-351P',
        'DSC-C-FC-352P',
        'DSC-C-FC-353P',
        'DSC-M-FC-354P',
        'DSC-M-FC-355P1',
        'DSC-M-FC-355P2',
        'FC701',
        'FC702',
        'FC703',
        'FC704',
        'VAC-127',
        'DSC-C-FC-241P',
        'DSC-C-FC-242P',
        'DSC-C-FC-243P1',
        'DSC-C-FC-243P2',
        'DSC-M-FC-244P1',
        'DSC-M-FC-244P2',
        'FC601',
        'FC602',
        'FC603',
        'FC604',
        'FC605',
        'FC606',
        'FC801',
        'FC802',
        'DSC-C-NME-231P1',
        'DSC-C-NME-231P2',
        'DSC-C-NME-232P',
        'DSC-C-NME-233P',
        'MDC-NME-234P1',
        'MDC-NME-234P2',
        'DSC-C-NME-351P',
        'DSC-C-NME-352P',
        'DSC-C-NME-353P',
        'DSC-M-NME-354P',
        'DSC-M-NME-355P1',
        'DSC-M-NME-355P2',
        'NE701',
        'NE702',
        'NE703',
        'NE704',
        'NE705',
        'DCS-C-NE-241P',
        'DCS-C-NE-242P',
        'DCS-C-NE-243P1',
        'DCS-C-NE-243P2',
        'DCS-M-NE-244P1',
        'DCS-M-NE-244P2',
        'SEC-246',
        'VAC-247',
        'DCS-C-NE-361P1',
        'DCS-C-NE-361P2',
        'DCS-C-NE-362P',
        'DCS-C-NE-363P',
        'DCS-M-NE-364P1',
        'DCS-M-NE-364P2',
        'DSC-C-PD-231P1',
        'DSC-C-PD-231P2',
        'DSC-C-PD-232P',
        'DSC-C-PD-233P',
        'MDC-PD-234P1',
        'MDC-PD-234P2',
        'DSC-C-PD-351P',
        'DSC-C-PD-352P',
        'DSC-C-PD-353P',
        'DSC-M-PD-354P',
        'DSC-M-PD-355P1',
        'DSC-M-PD-355P2',
        'PD701',
        'PD702',
        'PD703',
        'PD704',
        'PD705',
        'PD706',
        'DCS-C-PD-241P',
        'DCS-C-PD-242P',
        'DCS-C-PD-243P1',
        'DCS-C-PD-243P2',
        'DCS-M-PD-244P1',
        'DCS-M-PD-244P2',
        'PD601',
        'PD602',
        'PD603',
        'PD604',
        'PD605',
        'PD606',
        'PD801',
        'PD802',
        'DSC-C-VC-231P1',
        'DSC-C-VC-231P2',
        'DSC-C-VC-232P',
        'DSC-C-VC-233P',
        'MDC-VC-234P',
        'DSC-C-VC-351P',
        'DSC-C-VC-352P',
        'DSC-C-VC-353P',
        'DSC-M-VC-354P',
        'DSC-M-VC-355P',
        'BDVC31',
        'BDVC32',
        'BDVC33',
        'BDVC34',
        'BDVC35',
        'DCS-C-VC-241P1',
        'DCS-C-VC-241P2',
        'DCS-C-VC-242P',
        'DCS-C-VC-243P',
        'MDC-VC-244P',
        'DCS-C-VC-361P',
        'DCS-C-VC-362P1',
        'DCS-C-VC-363P',
        'DCS-M-VC-364P',
        'BDVC36',
        'DSC-C-UIUX-231P',
        'DSC-C-UIUX-232P1',
        'DSC-C-UIUX-232P2',
        'DSC-C-UIUX-233P',
        'MDC-UIUX-234P',
        'DSC-C-UIUX-351P',
        'DSC-C-UIUX-352P',
        'DSC-C-UIUX-353P',
        'DSC-M-UIUX-354P',
        'DSC-M-UIUX-355P',
        'UIX701',
        'UIX702',
        'UIX703',
        'UIX704',
        'UIX705',
        'DCS-C-UIX-241P',
        'DCS-C-UIX-242P',
        'DCS-C-UIX-243P1',
        'DCS-C-UIX-243P2',
        'DCS-M-UIX-244P',
        'DSC-C-UI&UX-361',
        'DSC-C-UI&UX-362P',
        'DSC-C-UI&UX-363P1',
        'DSC-C-UI&UX-363P2',
        'DSC-C-UI&UX-364',
        'BDIX36',
        'DSC-C-LSA-231P',
        'DSC-C-LSA-232P',
        'DSC-C-LSA-233P1',
        'DSC-C-LSA-233P2',
        'MDC-LSA-234P1',
        'MDC-LSA-234P2',
        'DSC-C-LSA-351P',
        'DSC-C-LSA-352P',
        'DSC-C-LSA-353P',
        'DSC-M-LSA-354P',
        'DSC-M-LSA-355P1',
        'DSC-M-LSA-355P2',
        'LSA701',
        'LSA702',
        'LSA703',
        'LSA704',
        'LSA705',
        'LSA706',
        'DSC-C-LSA-241',
        'DSC-C-LSA-242',
        'DSC-C-LSA-243P1',
        'DSC-C-LSA-243P2',
        'DSC-M-LSA-244P1',
        'DSC-M-LSA-244P2',
        'SEC-EMC-246',
        'VAC-GEI-247',
        'DSC-C-LSA-363P1',
        'DSC-C-LSA-362P',
        'DSC-C-LSA-361P',
        'DSC-M-LSA-364P2',
        'DSC-M-LSA-364P1',
        'DSC-C-LSA-363P2',
        'LSA801'
      ]

      const isSpecialSubject = FOUR_HOUR_SUBJECT_CODES.includes(subjectInfo[0].code)

      let end: Date
      let durationText: string

      if (isSpecialSubject) {
        // start time + 4 hours (06:30 → 10:30 etc.)
        end = new Date(start.getTime() + 4 * 60 * 60 * 1000)
        durationText = '4 hr'
      } else {
        // existing behavior (UNCHANGED)
        end = new Date(start.getTime() + 55 * 60000)
        durationText = '1 hr'
      }

      const presentCount = attendanceData.filter(
        a => a.lecture_id === l.id && a.status === 'Present'
      ).length

      const totalStudents = students.length

      topicPage.drawText(
        `${start.toLocaleDateString('en-GB')} ` +
        `[${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}] ` +
        `[${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}] ` +
        `(${durationText}) (${presentCount}/${totalStudents}) - ${l.title}`,
        { x: 50, y: topicY, size: 9, font: fontRegular }
      )


      topicY -= 18

    }

    // ================= SIGNATURE SECTION (CENTERED) =================
    const sigY = 80
    const lineW = 140

    const drawCenteredSign = (
      lineX: number,
      title: string,
      name: string
    ) => {
      const centerX = lineX + lineW / 2

      // line
      topicPage.drawLine({
        start: { x: lineX, y: sigY + 15 },
        end: { x: lineX + lineW, y: sigY + 15 },
        thickness: 1
      })

      // title (centered)
      const titleWidth = fontBold.widthOfTextAtSize(title, 8)
      topicPage.drawText(title, {
        x: centerX - titleWidth / 2,
        y: sigY,
        size: 8,
        font: fontBold
      })

      // name (centered)
      const nameText = `(${name})`
      const nameWidth = fontRegular.widthOfTextAtSize(nameText, 8)
      topicPage.drawText(nameText, {
        x: centerX - nameWidth / 2,
        y: sigY - 12,
        size: 8,
        font: fontRegular
      })
    }

    // Visiting Tutor
    drawCenteredSign(
      45,
      'Visiting Tutor Sign',
      tutorInfo[0].name
    )

    // Program Incharge
    drawCenteredSign(
      235,
      'Program Incharge Sign',
      subjectInfo[0].admin_name || 'Course Admin'
    )

    // Director
    drawCenteredSign(
      425,
      'Director Sign',
      'Dr. Paavan Pandit'
    )




    /* ================= ATTENDANCE GRID ================= */

    const drawGridHeader = (p: any, y: number, lec: any[]) => {
      let h = 'Student Name'.padEnd(25)
      lec.forEach(l => {
        const d = new Date(l.lecture_date).toLocaleDateString('en-GB', { day: '2-digit' })
        h += `| ${d}`
      })
      p.drawText(h, { x: 50, y, size: 8.5, font: fontRegular })
      p.drawLine({ start: { x: 50, y: y - 4 }, end: { x: 560, y: y - 4 }, thickness: 0.8 })
    }

    const LECTURES_PER_PAGE = 20

    for (let i = 0; i < lectures.length; i += LECTURES_PER_PAGE) {
      const chunk = lectures.slice(i, i + LECTURES_PER_PAGE)
      let p = pdfDoc.addPage([612, 792])

      p.drawRectangle({
        x: 30, y: 30, width: 552, height: 732,
        borderWidth: 1.5, borderColor: black
      })

      drawSamanvayWatermark(p)

      let gy = height - 80
      p.drawText('ATTENDANCE REGISTER GRID', {
        x: 50, y: gy, size: 12, font: fontBold
      })

      gy -= 30
      drawGridHeader(p, gy, chunk)
      gy -= 22

      for (const s of students) {
        if (gy < 50) {
          p = pdfDoc.addPage([612, 792])
          p.drawRectangle({
            x: 30, y: 30, width: 552, height: 732,
            borderWidth: 1.5, borderColor: black
          })
          drawSamanvayWatermark(p)
          gy = height - 80
          drawGridHeader(p, gy, chunk)
          gy -= 22
        }

        let row = s.full_name.substring(0, 22).padEnd(25)
        chunk.forEach(l => {
          row += `| ${attMap.get(`${l.id}-${s.id}`) === 'Present' ? 'P' : 'A'} `
        })

        p.drawText(row, { x: 50, y: gy, size: 8.5, font: fontRegular })
        gy -= 15
      }
    }

    const pdfBytes = await pdfDoc.save()
    return new Response(pdfBytes, { headers: { "Content-Type": "application/pdf" } })

  } catch (error) {
    console.error(error)
    return Response.json({ success: false }, { status: 500 })
  }
}
