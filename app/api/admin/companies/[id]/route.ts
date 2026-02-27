import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = params.id
    const {
      name,
      position,
      description,
      application_deadline,
      targeting_mode,
      interest_id,
      course_id,
      semester,
      opening_type,
      tenure_days,
      custom_link,
      image_url,
    } = await request.json()

    if (opening_type !== "job" && opening_type !== "internship") {
      return NextResponse.json({ success: false, message: "Invalid opening_type" }, { status: 400 })
    }
    const tenureValue = opening_type === "internship" ? Number(tenure_days) : null
    if (opening_type === "internship" && (!tenureValue || tenureValue <= 0)) {
      return NextResponse.json({ success: false, message: "tenure_days must be > 0 for internships" }, { status: 400 })
    }

    if (targeting_mode === "interest") {
      await sql`
        UPDATE companies SET
          name = ${name},
          position = ${position},
          description = ${description},
          interest_id = ${interest_id},
          application_deadline = ${application_deadline},
          targeting_mode = 'interest',
          course_id = NULL,
          semester = NULL,
          opening_type = ${opening_type},
          tenure_days = ${tenureValue},
          custom_link = ${custom_link || null},
          image_url = ${image_url || null}
        WHERE id = ${companyId}
      `
    } else if (targeting_mode === "course_semester") {
      await sql`
        UPDATE companies SET
          name = ${name},
          position = ${position},
          description = ${description},
          interest_id = NULL,
          application_deadline = ${application_deadline},
          targeting_mode = 'course_semester',
          course_id = ${course_id},
          semester = ${semester},
          opening_type = ${opening_type},
          tenure_days = ${tenureValue},
          custom_link = ${custom_link || null},
          image_url = ${image_url || null}
        WHERE id = ${companyId}
      `
    } else {
      return NextResponse.json({ success: false, message: "Invalid targeting_mode" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Company opening updated successfully" })
  } catch (error) {
    console.error("Company update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update company opening" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = params.id

    await sql`DELETE FROM companies WHERE id = ${companyId}`

    return NextResponse.json({ success: true, message: "Company opening deleted successfully" })
  } catch (error) {
    console.error("Company delete error:", error)
    return NextResponse.json({ success: false, message: "Failed to delete company opening" }, { status: 500 })
  }
}
