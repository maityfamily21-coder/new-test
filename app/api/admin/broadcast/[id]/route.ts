import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, content, image_url, custom_link_url, custom_link_text, is_active } = await request.json()
    const id = Number.parseInt(params.id)

    if (!title || !content) {
      return NextResponse.json({ success: false, message: "Title and content are required" }, { status: 400 })
    }

    const [broadcast] = await sql`
      UPDATE broadcast_messages
      SET title = ${title},
          content = ${content},
          image_url = ${image_url || null},
          custom_link_url = ${custom_link_url || null},
          custom_link_text = ${custom_link_text || null},
          is_active = ${is_active !== false},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (!broadcast) {
      return NextResponse.json({ success: false, message: "Broadcast not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, broadcast })
  } catch (error) {
    console.error("Broadcast update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update broadcast" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    await sql`DELETE FROM broadcast_messages WHERE id = ${id}`

    return NextResponse.json({ success: true, message: "Broadcast deleted successfully" })
  } catch (error) {
    console.error("Broadcast delete error:", error)
    return NextResponse.json({ success: false, message: "Failed to delete broadcast" }, { status: 500 })
  }
}
