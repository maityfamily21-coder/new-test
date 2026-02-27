import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ensureHolidaysTable } from "@/lib/holidays"

export const dynamic = "force-dynamic"
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    await ensureHolidaysTable()

    const body = await request.json()
    const { holidayDate, holidayName, description, adminId } = body

    if (!holidayDate || !holidayName) {
      return NextResponse.json({ success: false, error: "Holiday date and name are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO holidays (holiday_date, holiday_name, holiday_type, description, created_by_admin_id)
      VALUES (${holidayDate}, ${holidayName}, 'custom', ${description || null}, ${adminId || null})
      ON CONFLICT (holiday_date) DO UPDATE SET
        holiday_name = ${holidayName},
        description = ${description || null}
      RETURNING *
    `

    return NextResponse.json({ success: true, holiday: result[0] })
  } catch (error: any) {
    console.error("[MYT] Error adding holiday:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
