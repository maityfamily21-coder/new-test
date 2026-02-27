import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id
    const { title, description, interest_id, seminar_date } = await request.json()

    await sql`
      UPDATE seminars SET
        title = ${title},
        description = ${description},
        interest_id = ${interest_id},
        seminar_date = ${seminar_date}
      WHERE id = ${seminarId}
    `

    return NextResponse.json({ success: true, message: "Seminar updated successfully" })
  } catch (error) {
    console.error("Seminar update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update seminar" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id

    await sql`DELETE FROM seminars WHERE id = ${seminarId}`

    return NextResponse.json({ success: true, message: "Seminar deleted successfully" })
  } catch (error) {
    console.error("Seminar delete error:", error)
    return NextResponse.json({ success: false, message: "Failed to delete seminar" }, { status: 500 })
  }
}
