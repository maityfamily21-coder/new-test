import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const messageId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(messageId)) {
      return NextResponse.json({ success: false, message: "Invalid message id" }, { status: 400 })
    }

    const recipients = await sql`
      SELECT 
        s.id,
        s.enrollment_number,
        s.full_name,
        c.name AS course_name,
        s.current_semester
      FROM message_recipients mr
      JOIN students s ON s.id = mr.student_id
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE mr.message_id = ${messageId}
      ORDER BY s.enrollment_number ASC
    `

    return NextResponse.json({ success: true, recipients })
  } catch (error) {
    console.error("Fetch message recipients error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch recipients" }, { status: 500 })
  }
}
