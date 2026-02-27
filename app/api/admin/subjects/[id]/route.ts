import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { id } = await Promise.resolve(params)
    const body = await request.json()
    const { name, code, semester } = body

    console.log("[MYT] PUT /api/admin/subjects/[id] - id:", id, "body:", body)

    if (!name || !code || !semester) {
      return Response.json({ error: "Missing required fields: name, code, semester" }, { status: 400 })
    }

    const result = await sql`
      UPDATE subjects 
      SET name = ${name}, code = ${code}, semester = ${Number.parseInt(semester)}, updated_at = NOW()
      WHERE id = ${Number.parseInt(id)}
      RETURNING id, name, code, course_id, semester
    `

    revalidatePath("/api/admin/subjects")
    revalidatePath("/admin/subjects")

    console.log("[MYT] Subject updated:", result)
    return Response.json({ success: true, message: "Subject updated successfully", data: result?.[0] })
  } catch (error) {
    console.error("[MYT] Error in PUT /api/admin/subjects/[id]:", error)
    return Response.json(
      {
        error: "Failed to update subject",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { id } = await Promise.resolve(params)

    console.log("[MYT] DELETE /api/admin/subjects/[id] - id:", id)

    const result = await sql`DELETE FROM subjects WHERE id = ${Number.parseInt(id)}`

    revalidatePath("/api/admin/subjects")
    revalidatePath("/admin/subjects")

    console.log("[MYT] Subject deleted:", result)
    return Response.json({ success: true, message: "Subject deleted successfully" })
  } catch (error) {
    console.error("[MYT] Error in DELETE /api/admin/subjects/[id]:", error)
    return Response.json(
      {
        error: "Failed to delete subject",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
