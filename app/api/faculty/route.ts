import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const faculty = await sql`
      SELECT * FROM faculty ORDER BY name ASC
    `

    return NextResponse.json({ success: true, faculty })
  } catch (error) {
    console.error("Faculty fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch faculty" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      designation,
      department,
      email,
      phone_number,
      about,
      photo_url,
      instagram_url,
      linkedin_url,
      whatsapp_number,
    } = await request.json()

    if (!name || !designation || !email || !phone_number) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    await sql`
      INSERT INTO faculty (name, designation, department, email, phone_number, about, photo_url, instagram_url, linkedin_url, whatsapp_number)
      VALUES (${name}, ${designation}, ${department}, ${email}, ${phone_number}, ${about}, ${photo_url}, ${instagram_url || null}, ${linkedin_url || null}, ${whatsapp_number || null})
    `

    return NextResponse.json({ success: true, message: "Faculty added successfully" })
  } catch (error) {
    console.error("Faculty creation error:", error)
    return NextResponse.json({ success: false, message: "Failed to add faculty" }, { status: 500 })
  }
}
