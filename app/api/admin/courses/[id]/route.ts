import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const courseId = params.id
    const { name, total_semesters } = await request.json()

    await sql`
      UPDATE courses SET
        name = ${name},
        total_semesters = ${total_semesters}
      WHERE id = ${courseId}
    `

    return NextResponse.json({ success: true, message: "Course updated successfully" })
  } catch (error) {
    console.error("Course update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update course" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const courseId = params.id

    // Check if there are students enrolled in this course
    const studentsCount = await sql`
      SELECT COUNT(*) as count FROM students WHERE course_id = ${courseId}
    `

    if (Number.parseInt(studentsCount[0].count) > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete course. ${studentsCount[0].count} students are enrolled in this course. Please move or delete the students first.`,
        },
        { status: 400 },
      )
    }

    // Check if there are messages for this course
    const messagesCount = await sql`
      SELECT COUNT(*) as count FROM messages WHERE course_id = ${courseId}
    `

    if (Number.parseInt(messagesCount[0].count) > 0) {
      // Delete related messages first
      await sql`DELETE FROM messages WHERE course_id = ${courseId}`
    }

    // Now safe to delete the course
    await sql`DELETE FROM courses WHERE id = ${courseId}`

    return NextResponse.json({ success: true, message: "Course deleted successfully" })
  } catch (error) {
    console.error("Course delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete course. Please ensure no students are enrolled in this course." },
      { status: 500 },
    )
  }
}
