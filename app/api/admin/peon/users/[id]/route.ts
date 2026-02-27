import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const { name, email, username, password, phone_number } = await request.json()

    if (!name || !email || !username) {
      return NextResponse.json({ success: false, message: "Required fields missing" }, { status: 400 })
    }

    if (password) {
      await sql`
        UPDATE peon_housekeeping_users
        SET name = ${name}, email = ${email}, username = ${username}, 
            password = ${password}, phone_number = ${phone_number || null}, updated_at = NOW()
        WHERE id = ${id}
      `
    } else {
      await sql`
        UPDATE peon_housekeeping_users
        SET name = ${name}, email = ${email}, username = ${username}, 
            phone_number = ${phone_number || null}, updated_at = NOW()
        WHERE id = ${id}
      `
    }

    return NextResponse.json({ success: true, message: "User updated successfully" })
  } catch (error) {
    console.error("Failed to update user:", error)
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    await sql`DELETE FROM peon_housekeeping_users WHERE id = ${id}`

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Failed to delete user:", error)
    return NextResponse.json({ success: false, message: "Failed to delete user" }, { status: 500 })
  }
}
