import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messageId = params.id

    await sql`DELETE FROM messages WHERE id = ${messageId}`

    return NextResponse.json({ success: true, message: "Message deleted successfully" })
  } catch (error) {
    console.error("Message delete error:", error)
    return NextResponse.json({ success: false, message: "Failed to delete message" }, { status: 500 })
  }
}
