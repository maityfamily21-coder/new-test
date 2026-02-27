import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ensureHolidaysTable } from "@/lib/holidays"

export const dynamic = "force-dynamic"
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    await ensureHolidaysTable()

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year") || new Date().getFullYear())
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined

    let holidays: any[] = []

    if (month) {
      holidays = await sql`
        SELECT * FROM holidays 
        WHERE EXTRACT(YEAR FROM holiday_date) = ${year}
        AND EXTRACT(MONTH FROM holiday_date) = ${month}
        ORDER BY holiday_date ASC
      `
    } else {
      holidays = await sql`
        SELECT * FROM holidays 
        WHERE EXTRACT(YEAR FROM holiday_date) = ${year}
        ORDER BY holiday_date ASC
      `
    }

    // Add default holidays (Sundays and 2nd/4th Saturdays)
    const defaultHolidays = getDefaultHolidays(year, month)

    return NextResponse.json({
      success: true,
      customHolidays: holidays,
      defaultHolidays: defaultHolidays,
      allHolidays: [...holidays, ...defaultHolidays],
    })
  } catch (error: any) {
    console.error("[MYT] Error fetching holidays:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

function getDefaultHolidays(year: number, month?: number): any[] {
  const holidays = []
  const startMonth = month || 1
  const endMonth = month || 12

  for (let m = startMonth; m <= endMonth; m++) {
    // Add all Sundays
    for (let d = 1; d <= 31; d++) {
      const date = new Date(year, m - 1, d)
      if (date.getMonth() !== m - 1) break

      if (date.getDay() === 0) {
        holidays.push({
          id: `default-sunday-${date.toISOString()}`,
          holiday_date: date.toISOString().split("T")[0],
          holiday_name: `Sunday`,
          holiday_type: "default",
        })
      }

      if (date.getDay() === 6) {
        let saturdayCount = 0
        for (let day = 1; day <= d; day++) {
          const checkDate = new Date(year, m - 1, day)
          if (checkDate.getDay() === 6) {
            saturdayCount++
          }
        }

        if (saturdayCount === 2 || saturdayCount === 4) {
          holidays.push({
            id: `default-saturday-${date.toISOString()}`,
            holiday_date: date.toISOString().split("T")[0],
            holiday_name: `${saturdayCount === 2 ? "2nd" : "4th"} Saturday`,
            holiday_type: "default",
          })
        }
      }
    }
  }

  return holidays
}
