import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    let { exam_id, student_id, subject_id, attendance_status, markedByPersonnelId } = body

    exam_id = Number(exam_id)
    student_id = Number(student_id)
    subject_id = Number(subject_id)

    const markedByType = markedByPersonnelId ? "personnel" : "admin"
    const markedById = markedByPersonnelId || null

    console.log("[MYT] Manual attendance marking:", {
      exam_id,
      student_id,
      subject_id,
      attendance_status,
      markedByType,
      markedById,
    })

    if (!exam_id || isNaN(exam_id) || !student_id || isNaN(student_id) || !subject_id || isNaN(subject_id)) {
      return Response.json({ success: false, message: "Missing or invalid required fields" }, { status: 400 })
    }

    if (!attendance_status || !["present", "absent"].includes(attendance_status)) {
      return Response.json(
        { success: false, message: "Invalid attendance status. Must be 'present' or 'absent'" },
        { status: 400 },
      )
    }

    // Check if attendance already marked via QR
    const existingAttendance = await sql`
      SELECT id, attendance_status, marked_by_type FROM exam_attendance 
      WHERE exam_id = ${exam_id} AND student_id = ${student_id} AND subject_id = ${subject_id}
    `

    if (existingAttendance.length > 0) {
      const existing = existingAttendance[0]

      // If marked via QR, don't allow manual override
      if (existing.marked_by_type === "qr") {
        return Response.json(
          {
            success: false,
            message:
              "This student was already scanned via QR. Manual marking is not allowed for QR-scanned attendance.",
          },
          { status: 409 },
        )
      }

      // If already manually marked, update it
      if (existing.marked_by_type === "admin" || existing.marked_by_type === "personnel") {
        await sql`
          UPDATE exam_attendance 
          SET attendance_status = ${attendance_status}, 
              updated_at = NOW(),
              marked_by_type = ${markedByType},
              marked_by_id = ${markedById}
          WHERE exam_id = ${exam_id} AND student_id = ${student_id} AND subject_id = ${subject_id}
        `

        console.log("[MYT] Manual attendance updated for student:", student_id)
        return Response.json({
          success: true,
          message: "Attendance updated successfully",
        })
      }
    }

    // Create new manual attendance record
    await sql`
      INSERT INTO exam_attendance (exam_id, student_id, subject_id, attendance_status, marked_by_type, marked_by_id)
      VALUES (${exam_id}, ${student_id}, ${subject_id}, ${attendance_status}, ${markedByType}, ${markedById})
    `

    console.log("[MYT] Manual attendance marked for student:", student_id)

    return Response.json({
      success: true,
      message: "Attendance marked successfully",
    })
  } catch (error) {
    console.error("[MYT] Error marking manual attendance:", error)
    return Response.json(
      {
        success: false,
        message: "Failed to mark attendance: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    )
  }
}
