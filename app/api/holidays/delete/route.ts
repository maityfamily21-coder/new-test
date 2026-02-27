import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { holidayDate } = body

    if (!holidayDate) {
      return NextResponse.json({ success: false, error: "Holiday date is required" }, { status: 400 })
    }

    await sql`
      DELETE FROM holidays
      WHERE holiday_date = ${holidayDate}
      AND holiday_type = 'custom'
    `

    return NextResponse.json({ success: true, message: "Holiday deleted successfully" })
  } catch (error: any) {
    console.error("[MYT] Error deleting holiday:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
