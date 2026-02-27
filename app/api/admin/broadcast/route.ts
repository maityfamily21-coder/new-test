import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const broadcasts = await sql`
      SELECT * FROM broadcast_messages
      ORDER BY created_at DESC
    `
    return NextResponse.json({ success: true, broadcasts })
  } catch (error) {
    console.error("Broadcast fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch broadcasts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { title, content, image_url, custom_link_url, custom_link_text, is_active } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ success: false, message: "Title and content are required" }, { status: 400 })
    }

    const [broadcast] = await sql`
      INSERT INTO broadcast_messages (title, content, image_url, custom_link_url, custom_link_text, is_active)
      VALUES (${title}, ${content}, ${image_url || null}, ${custom_link_url || null}, ${custom_link_text || null}, ${is_active !== false})
      RETURNING *
    `

    return NextResponse.json({ success: true, broadcast })
  } catch (error) {
    console.error("Broadcast creation error:", error)
    return NextResponse.json({ success: false, message: "Failed to create broadcast" }, { status: 500 })
  }
}
