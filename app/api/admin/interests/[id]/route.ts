import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const interestId = params.id
    const { name } = await request.json()

    await sql`
      UPDATE interests SET name = ${name} WHERE id = ${interestId}
    `

    return NextResponse.json({ success: true, message: "Interest updated successfully" })
  } catch (error) {
    console.error("Interest update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update interest" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const interestId = params.id

    // Check if there are students with this interest
    const studentsCount = await sql`
      SELECT COUNT(*) as count FROM student_interests WHERE interest_id = ${interestId}
    `

    // Check if there are companies with this interest
    const companiesCount = await sql`
      SELECT COUNT(*) as count FROM companies WHERE interest_id = ${interestId}
    `

    // Check if there are seminars with this interest
    const seminarsCount = await sql`
      SELECT COUNT(*) as count FROM seminars WHERE interest_id = ${interestId}
    `

    // Check if there are messages with this interest
    const messagesCount = await sql`
      SELECT COUNT(*) as count FROM messages WHERE interest_id = ${interestId}
    `

    const totalReferences =
      Number.parseInt(studentsCount[0].count) +
      Number.parseInt(companiesCount[0].count) +
      Number.parseInt(seminarsCount[0].count) +
      Number.parseInt(messagesCount[0].count)

    if (totalReferences > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete interest. It is being used by ${studentsCount[0].count} students, ${companiesCount[0].count} companies, ${seminarsCount[0].count} seminars, and ${messagesCount[0].count} messages. Please remove these references first.`,
        },
        { status: 400 },
      )
    }

    // Safe to delete
    await sql`DELETE FROM interests WHERE id = ${interestId}`

    return NextResponse.json({ success: true, message: "Interest deleted successfully" })
  } catch (error) {
    console.error("Interest delete error:", error)
    return NextResponse.json({ success: false, message: "Failed to delete interest" }, { status: 500 })
  }
}
