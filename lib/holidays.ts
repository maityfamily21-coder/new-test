import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function isHoliday(date: Date): Promise<boolean> {
  const dateStr = date.toISOString().split("T")[0]

  // Check if Sunday
  if (date.getDay() === 0) return true

  // Check if 2nd or 4th Saturday
  if (date.getDay() === 6) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const dateOfMonth = date.getDate()

    // Find all Saturdays in the month and determine which occurrence this date is
    let saturdayCount = 0
    for (let day = 1; day <= dateOfMonth; day++) {
      const checkDate = new Date(year, month, day)
      if (checkDate.getDay() === 6) {
        saturdayCount++
      }
    }

    // Only 2nd and 4th Saturdays are holidays
    if (saturdayCount === 2 || saturdayCount === 4) {
      return true
    }
  }

  // Check custom holidays in database
  try {
    const result = await sql`
      SELECT id FROM holidays 
      WHERE holiday_date = ${dateStr}
      LIMIT 1
    `
    return result.length > 0
  } catch (error) {
    console.error("[MYT] Error checking custom holidays:", error)
    return false
  }
}

export async function countWorkingDays(startDate: Date, endDate: Date): Promise<number> {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    if (!(await isHoliday(current))) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

export async function ensureHolidaysTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        holiday_date DATE NOT NULL UNIQUE,
        holiday_name VARCHAR(255) NOT NULL,
        holiday_type VARCHAR(50) NOT NULL DEFAULT 'custom',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_admin_id INTEGER
      )
    `

    // Create index separately with correct PostgreSQL syntax
    await sql`
      CREATE INDEX IF NOT EXISTS idx_holiday_date ON holidays(holiday_date)
    `
  } catch (error) {
    console.error("[MYT] Error creating holidays table:", error)
  }
}
