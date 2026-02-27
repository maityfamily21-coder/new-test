import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const interests = await sql`
      SELECT * FROM interests ORDER BY created_at DESC
    `

    return NextResponse.json({ success: true, interests })
  } catch (error) {
    console.error("Interests fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch interests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    await sql`
      INSERT INTO interests (name) VALUES (${name})
    `

    return NextResponse.json({ success: true, message: "Interest added successfully" })
  } catch (error) {
    console.error("Interest creation error:", error)
    return NextResponse.json({ success: false, message: "Failed to add interest" }, { status: 500 })
  }
}
