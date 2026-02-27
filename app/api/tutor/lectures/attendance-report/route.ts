import PDFDocument from 'pdfkit'
import { neon } from "@neondatabase/serverless"

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
      attendanceData.map((r: any) => [`${r.lecture_id}-${r.student_id}`, r.status])
    )

    /* ===================== PDF SETUP ===================== */
    const pdfDoc = new PDFDocument({ size: 'LETTER', margin: 30 })

    // Simple attendance report using pdfkit
    pdfDoc.fontSize(14).font('Helvetica-Bold').text('Visiting Tutor Payment Voucher Report', { align: 'center' })
    
    pdfDoc.moveDown()
    pdfDoc.fontSize(10).font('Helvetica')
    pdfDoc.text(`Tutor Name: ${tutorInfo[0]?.name || 'N/A'}`)
    pdfDoc.text(`Department: ${tutorInfo[0]?.department || 'N/A'}`)
    pdfDoc.text(`Course: ${subjectInfo[0]?.course_name || 'N/A'}`)
    pdfDoc.text(`Subject: ${subjectInfo[0]?.name || 'N/A'} [${subjectInfo[0]?.code || 'N/A'}]`)
    pdfDoc.text(`Date Range: ${fromDate} to ${toDate}`)
    pdfDoc.text(`Total Lectures Conducted: ${lectures.length}`)
    
    const totalPossible = students.length * lectures.length
    const totalPresent = attendanceData.filter((r: any) => r.status === 'Present').length
    const overallPercentage = totalPossible > 0 ? ((totalPresent / totalPossible) * 100).toFixed(2) : '0.00'
    pdfDoc.text(`Overall Present Percentage: ${overallPercentage}%`)
    
    pdfDoc.moveDown()
    pdfDoc.fontSize(12).font('Helvetica-Bold').text('LECTURE TOPICS CONDUCTED:', { underline: true })
    pdfDoc.moveDown()
    
    for (const l of lectures) {
      const start = new Date(l.lecture_date)
      const FOUR_HOUR_SUBJECTS = ['DCS-C-VC-362P2', 'DSC-C-DF-111P', 'DSC-C-DF-112P']
      const isSpecial = FOUR_HOUR_SUBJECTS.includes(subjectInfo[0]?.code)
      const end = new Date(start.getTime() + (isSpecial ? 4 * 60 * 60 * 1000 : 55 * 60000))
      
      const presentCount = attendanceData.filter((a: any) => a.lecture_id === l.id && a.status === 'Present').length
      
      pdfDoc.fontSize(9).font('Helvetica')
      pdfDoc.text(
        `${start.toLocaleDateString('en-GB')} [${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}] ` +
        `[${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}] (${presentCount}/${students.length}) - ${l.title}`
      )
    }
    
    pdfDoc.moveDown()
    pdfDoc.fontSize(10).font('Helvetica-Bold').text('Visiting Tutor Sign: ____________________', { x: 50 })
    pdfDoc.text(`(${tutorInfo[0]?.name || 'N/A'})`, { x: 50 })

    return new Promise((resolve, reject) => {
      const chunks: any[] = []
      pdfDoc.on('data', (chunk: any) => chunks.push(chunk))
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(new Response(pdfBuffer, { headers: { 'Content-Type': 'application/pdf' } }))
      })
      pdfDoc.on('error', reject)
      pdfDoc.end()
    })
  } catch (error) {
    console.error(error)
    return Response.json({ success: false }, { status: 500 })
  }
}
