import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messageId = Number.parseInt(params.id, 10)
    if (!Number.isFinite(messageId)) {
      return NextResponse.json({ success: false, message: "Invalid message id" }, { status: 400 })
    }

    const tableRes = await sql`SELECT to_regclass('public.message_course_semesters') AS reg`
    const mappingExists = Array.isArray(tableRes) && tableRes[0]?.reg
    if (!mappingExists) {
      return NextResponse.json({ success: true, targets: [] })
    }

    const rows = await sql`
      SELECT mcs.course_id, c.name AS course_name, mcs.semester
      FROM message_course_semesters mcs
      JOIN courses c ON c.id = mcs.course_id
      WHERE mcs.message_id = ${messageId}
      ORDER BY c.name, mcs.semester
    `
    return NextResponse.json({ success: true, targets: rows })
  } catch (error) {
    console.error("[messages targets] error", error)
    return NextResponse.json({ success: false, message: "Failed to fetch targets" }, { status: 500 })
  }
}
