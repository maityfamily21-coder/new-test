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

    // Get QR token for this student and exam
    const tokenResult = await sql(
      `SELECT qr_data FROM exam_qr_tokens 
       WHERE exam_id = $1 AND student_id = $2 LIMIT 1`,
      [Number.parseInt(params.examId), Number.parseInt(studentId)],
    )

    if (tokenResult.length === 0) {
      return Response.json({ error: "QR token not found" }, { status: 404 })
    }

    const qrData = tokenResult[0].qr_data
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 300,
    })

    return Response.json({ qr_code: qrCode })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return Response.json({ error: "Failed to generate QR code" }, { status: 500 })
  }
}
