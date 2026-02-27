import { neon } from "@neondatabase/serverless"
import type { NextRequest } from "next/server"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const semester = searchParams.get("semester")

    if (!courseId || !semester) {
      return Response.json({ success: false, error: "courseId and semester required" }, { status: 400 })
    }

    const batches = await sql`
      SELECT 
        b.id,
        b.batch_name,
        b.description,
        b.batch_number,
        b.course_id,
        b.semester,
        b.total_students,
        b.created_at,
        COUNT(DISTINCT bs.student_id) as assigned_students
      FROM batches b
      LEFT JOIN batch_students bs ON b.id = bs.batch_id
      WHERE b.course_id = ${Number(courseId)} AND b.semester = ${Number(semester)}
      GROUP BY b.id, b.batch_name, b.description, b.batch_number, b.course_id, b.semester, b.total_students, b.created_at
      ORDER BY b.batch_number ASC
    `

    return Response.json({ success: true, batches })
  } catch (error) {
    console.error("[BATCH] Error fetching batches:", error)
    return Response.json({ success: false, error: "Failed to fetch batches" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { courseId, semester, batchName, description, batchNumber } = await request.json()

    if (!courseId || !semester || !batchName || batchNumber === undefined) {
      return Response.json(
        { success: false, error: "courseId, semester, batchName, and batchNumber are required" },
        { status: 400 },
      )
    }

    // Check if batch already exists
    const existing = await sql`
      SELECT id FROM batches 
      WHERE course_id = ${courseId} AND semester = ${semester} AND batch_number = ${batchNumber}
    `

    if (existing.length > 0) {
      return Response.json(
        { success: false, error: "Batch with this number already exists for this course-semester" },
        { status: 400 },
      )
    }

    const result = await sql`
      INSERT INTO batches (course_id, semester, batch_name, description, batch_number)
      VALUES (${courseId}, ${semester}, ${batchName}, ${description || null}, ${batchNumber})
      RETURNING *
    `

    return Response.json({ success: true, batch: result[0] })
  } catch (error) {
    console.error("[BATCH] Error creating batch:", error)
    return Response.json({ success: false, error: "Failed to create batch" }, { status: 500 })
  }
}
