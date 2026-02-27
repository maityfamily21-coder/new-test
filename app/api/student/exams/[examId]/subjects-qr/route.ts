import { neon } from "@neondatabase/serverless"
import QRCode from "qrcode"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return Response.json({ error: "Missing studentId" }, { status: 400 })
    }

    const tokens = await sql`
      SELECT 
        eqt.subject_id,
        eqt.token,
        eqt.qr_data,
        s.name as subject_name,
        s.code as subject_code,
        es.total_marks,
        es.exam_date,
        ea.attendance_status
      FROM exam_qr_tokens eqt
      JOIN subjects s ON eqt.subject_id = s.id
      JOIN exam_subjects es ON eqt.exam_id = es.exam_id AND eqt.subject_id = es.subject_id
      LEFT JOIN exam_attendance ea ON eqt.student_id = ea.student_id 
        AND eqt.subject_id = ea.subject_id 
        AND eqt.exam_id = ea.exam_id
      WHERE eqt.exam_id = ${Number.parseInt(params.examId)} 
        AND eqt.student_id = ${Number.parseInt(studentId)}
      ORDER BY s.name
    `

    if (!tokens || tokens.length === 0) {
      return Response.json({ error: "No QR tokens found for this exam" }, { status: 404 })
    }

    // Generate QR codes for each subject
    const qrCodes = await Promise.all(
      tokens.map(async (token) => {
        try {
          const qrCode = await QRCode.toDataURL(token.token, {
            errorCorrectionLevel: "H",
            type: "image/png",
            quality: 0.95,
            margin: 1,
            width: 300,
          })

          return {
            subject_id: token.subject_id,
            subject_name: token.subject_name,
            subject_code: token.subject_code,
            total_marks: token.total_marks,
            exam_date: token.exam_date,
            qr_code: qrCode,
            token: token.token,
            attendance_status: token.attendance_status || null,
          }
        } catch (err) {
          console.error("[MYT] QR generation error for subject:", err)
          return null
        }
      }),
    )

    // Filter out any null values from failed QR generations
    const validQRCodes = qrCodes.filter((qr) => qr !== null)

    return Response.json(validQRCodes || [])
  } catch (error: any) {
    console.error("[MYT] Error generating subject QR codes:", error.message)
    return Response.json({ error: "Failed to generate QR codes", details: error.message }, { status: 500 })
  }
}
