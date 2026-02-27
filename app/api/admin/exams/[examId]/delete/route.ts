import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: Request, { params }: { params: { examId: string } }) {
  try {
    const examIdNum = Number.parseInt(params.examId)

    if (isNaN(examIdNum)) {
      return Response.json({ error: "Invalid exam ID" }, { status: 400 })
    }

    // The database has ON DELETE CASCADE set up, so deleting the exam will automatically delete related records
    const result = await sql`
      DELETE FROM exams 
      WHERE id = ${examIdNum}
      RETURNING id, exam_name
    `

    if (!result || result.length === 0) {
      return Response.json({ error: "Exam not found" }, { status: 404 })
    }

    const deletedExam = result[0]
    console.log(
      "[MYT] Exam deleted successfully:",
      deletedExam.id,
      "-",
      deletedExam.exam_name,
      "and all related data (subjects, QR tokens, attendance)",
    )

    return Response.json(
      {
        success: true,
        message: `Exam "${deletedExam.exam_name}" and all related data deleted successfully`,
        exam_id: deletedExam.id,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("[MYT] Error deleting exam:", error.message)
    return Response.json({ success: false, error: "Failed to delete exam", details: error.message }, { status: 500 })
  }
}
