import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const faculty = await sql`
      SELECT * FROM faculty WHERE id = ${id}
    `

    if (faculty.length === 0) {
      return NextResponse.json({ success: false, message: "Faculty not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, faculty: faculty[0] })
  } catch (error) {
    console.error("Faculty fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch faculty" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
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

    await sql`
      UPDATE faculty 
      SET name = ${name}, 
          designation = ${designation}, 
          department = ${department}, 
          email = ${email}, 
          phone_number = ${phone_number}, 
          about = ${about}, 
          photo_url = ${photo_url},
          instagram_url = ${instagram_url || null},
          linkedin_url = ${linkedin_url || null},
          whatsapp_number = ${whatsapp_number || null},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true, message: "Faculty updated successfully" })
  } catch (error) {
    console.error("Faculty update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update faculty" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    await sql`
      DELETE FROM faculty WHERE id = ${id}
    `

    return NextResponse.json({ success: true, message: "Faculty deleted successfully" })
  } catch (error) {
    console.error("Faculty delete error:", error)
    return NextResponse.json({ success: false, message: "Failed to delete faculty" }, { status: 500 })
  }
}
