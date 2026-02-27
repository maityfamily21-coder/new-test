import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const { is_active } = await request.json()

    await sql`
      UPDATE peon_housekeeping_users
      SET is_active = ${is_active}, updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true, message: "Status updated successfully" })
  } catch (error) {
    console.error("Failed to update status:", error)
    return NextResponse.json({ success: false, message: "Failed to update status" }, { status: 500 })
  }
}
