import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const tutorId = Number.parseInt(params.id)
    console.log("[MYT] Admin API: Fetching assigned subjects for tutor ID:", tutorId)

    const assignedToCurrentTutor = await sql`
      SELECT s.id, s.name, s.code, c.name as course_name, s.semester, t.name as tutor_name, ts.tutor_id
      FROM subjects s
      JOIN tutor_subjects ts ON s.id = ts.subject_id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN tutors t ON ts.tutor_id = t.id
      WHERE ts.tutor_id = ${tutorId}
      ORDER BY c.name, s.semester
    `

    const assignedToOtherTutors = await sql`
      SELECT s.id, s.name, s.code, c.name as course_name, s.semester, t.name as tutor_name, ts.tutor_id
      FROM subjects s
      JOIN tutor_subjects ts ON s.id = ts.subject_id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN tutors t ON ts.tutor_id = t.id
      WHERE ts.tutor_id != ${tutorId}
      ORDER BY c.name, s.semester
    `

    console.log("[MYT] Admin API: Found assigned to current tutor:", assignedToCurrentTutor.length)
    console.log("[MYT] Admin API: Found assigned to other tutors:", assignedToOtherTutors.length)

    return Response.json({
      success: true,
      assignedToCurrentTutor,
      assignedToOtherTutors,
    })
  } catch (error) {
    console.error("[MYT] Admin API: Error fetching tutor subjects:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch subjects",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const tutorId = Number.parseInt(params.id)
    const { subjectIds } = await request.json()

    console.log("[MYT] Admin API: Assigning subjects to tutor ID:", tutorId, "Subject IDs:", subjectIds)

    if (!Array.isArray(subjectIds)) {
      return Response.json({ success: false, error: "Invalid subject IDs" }, { status: 400 })
    }

    const deleteResult = await sql`DELETE FROM tutor_subjects WHERE tutor_id = ${tutorId}`
    console.log("[MYT] Admin API: Deleted existing assignments for tutor:", tutorId)

    for (const subjectId of subjectIds) {
      const parsedSubjectId = Number.parseInt(String(subjectId))
      console.log("[MYT] Admin API: Inserting subject assignment - Tutor:", tutorId, "Subject:", parsedSubjectId)

      await sql`
        INSERT INTO tutor_subjects (tutor_id, subject_id)
        VALUES (${tutorId}, ${parsedSubjectId})
      `
    }

    console.log("[MYT] Admin API: Successfully assigned", subjectIds.length, "subjects to tutor", tutorId)

    revalidatePath(`/api/tutor/${tutorId}/subjects`)
    revalidatePath("/tutor/dashboard")

    return Response.json({ success: true, message: "Subjects assigned successfully" })
  } catch (error) {
    console.error("[MYT] Admin API: Error assigning subjects:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to assign subjects",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const tutorId = Number.parseInt(params.id)
    const { subjectId } = await request.json()

    console.log("[MYT] Admin API: Deassigning subject ID:", subjectId, "from tutor ID:", tutorId)

    if (!subjectId) {
      return Response.json({ success: false, error: "Subject ID is required" }, { status: 400 })
    }

    const parsedSubjectId = Number.parseInt(String(subjectId))

    await sql`
      DELETE FROM tutor_subjects 
      WHERE tutor_id = ${tutorId} AND subject_id = ${parsedSubjectId}
    `

    console.log("[MYT] Admin API: Successfully deassigned subject", parsedSubjectId, "from tutor", tutorId)

    revalidatePath(`/api/tutor/${tutorId}/subjects`)
    revalidatePath("/tutor/dashboard")
    revalidatePath(`/admin/tutors`)

    return Response.json({ success: true, message: "Subject deassigned successfully" })
  } catch (error) {
    console.error("[MYT] Admin API: Error deassigning subject:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to deassign subject",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
