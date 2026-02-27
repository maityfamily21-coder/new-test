import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"
import jsPDF from "jspdf"

export async function GET(request: NextRequest) {
  try {
    console.log("[MYT] Starting export with QR...")

    // Fetch all students with their data
    const students = await sql`
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        c.name as course_name,
        s.email,
        s.phone_number,
        s.current_semester,
        s.placement_status,
        s.company_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      ORDER BY s.enrollment_number
    `

    console.log("[MYT] Found students:", students?.length || 0)

    if (!students || students.length === 0) {
      return NextResponse.json({ success: false, message: "No students found" }, { status: 404 })
    }

    // Get the base URL from request headers
    const protocol = request.headers.get("x-forwarded-proto") || "https"
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000"
    const baseUrl = `${protocol}://${host}`

    console.log("[MYT] Base URL:", baseUrl)

    // Create PDF with jsPDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // A4 dimensions: 210mm x 297mm
    const pageWidth = 210
    const pageHeight = 297
    const margin = 5
    const usableWidth = pageWidth - 2 * margin
    const usableHeight = pageHeight - 2 * margin

    const cols = 9
    const rows = 8
    const cellWidth = usableWidth / cols
    const cellHeight = usableHeight / rows

    const qrSize = 20 // QR code size in mm (kept same)
    const textSpacing = 1 // Reduced from 4 to 1mm
    const qrPerPage = cols * rows

    let studentIndex = 0
    let pageNum = 0

    while (studentIndex < students.length) {
      if (pageNum > 0) {
        pdf.addPage()
      }

      let cellIndex = 0

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (studentIndex >= students.length) break

          const student = students[studentIndex]
          studentIndex++

          try {
            // Get or create QR token
            const [existing] = await sql`
              SELECT token FROM student_qr_tokens WHERE student_id = ${student.id} LIMIT 1
            `

            let token = existing?.token
            if (!token) {
              const { randomUUID } = await import("crypto")
              token = randomUUID()
              await sql`
                INSERT INTO student_qr_tokens (student_id, token)
                VALUES (${student.id}, ${token})
                ON CONFLICT (student_id) DO UPDATE SET token = EXCLUDED.token
              `
            }

            const qrUrl = `${baseUrl}/student-qr/${token}`
            console.log("[MYT] QR URL for student", student.id, ":", qrUrl)

            const encodedQrUrl = encodeURIComponent(qrUrl)
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedQrUrl}`

            let qrImageData = "/placeholder.svg"
            try {
              console.log("[MYT] Fetching QR image from:", qrImageUrl)
              const qrResponse = await fetch(qrImageUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0",
                },
              })
              if (qrResponse.ok) {
                const buffer = await qrResponse.arrayBuffer()
                const base64 = Buffer.from(buffer).toString("base64")
                qrImageData = `data:image/png;base64,${base64}`
                console.log("[MYT] Successfully fetched QR image for student", student.id)
              } else {
                console.error(`[MYT] QR fetch failed with status ${qrResponse.status}`)
              }
            } catch (fetchError) {
              console.error(`[MYT] Error fetching QR image for student ${student.id}:`, fetchError)
            }

            const x = margin + col * cellWidth + (cellWidth - qrSize) / 2
            const y = margin + row * cellHeight + 2

            // Add QR code image
            try {
              pdf.addImage(qrImageData, "PNG", x, y, qrSize, qrSize)
            } catch (imgError) {
              console.error(`[MYT] Error adding image to PDF:`, imgError)
            }

            const enrollmentNumber = student.enrollment_number || "N/A"
            pdf.setFontSize(5)
            pdf.text(enrollmentNumber, x + qrSize / 2, y + qrSize + textSpacing, {
              align: "center",
              maxWidth: cellWidth - 1,
            })

            const fullName = (student.full_name || "").substring(0, 15)
            pdf.setFontSize(4.5)
            pdf.text(fullName, x + qrSize / 2, y + qrSize + textSpacing + 2, {
              align: "center",
              maxWidth: cellWidth - 1,
            })

            const courseName = (student.course_name || "").substring(0, 12)
            pdf.setFontSize(4)
            pdf.text(courseName, x + qrSize / 2, y + qrSize + textSpacing + 3.5, {
              align: "center",
              maxWidth: cellWidth - 1,
            })

            const semester = student.current_semester ? `Sem ${student.current_semester}` : "N/A"
            pdf.setFontSize(4)
            pdf.text(semester, x + qrSize / 2, y + qrSize + textSpacing + 5, {
              align: "center",
              maxWidth: cellWidth - 1,
            })

            console.log(`[MYT] Added QR for student ${student.id} (${studentIndex}/${students.length})`)
          } catch (error) {
            console.error(`[MYT] Error processing student ${student.id}:`, error)
          }

          cellIndex++
        }
      }

      pageNum++
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"))

    console.log("[MYT] PDF generated successfully, size:", pdfBuffer.length)

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="students_qr_export_${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[MYT] Export with QR error:", error)
    return NextResponse.json(
      { success: false, message: "Export failed: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
