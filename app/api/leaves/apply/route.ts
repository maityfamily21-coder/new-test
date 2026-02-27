import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { countWorkingDays } from "@/lib/holidays"

export const dynamic = "force-dynamic"
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, userType, leaveType, startDate, endDate, reason } = body

    console.log("[MYT] Leave application request:", { userId, userType, leaveType, startDate, endDate })

    if (!userId || !userType || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = await countWorkingDays(start, end)

    console.log("[MYT] Calculated total working days (excluding holidays):", totalDays)

    if (totalDays <= 0) {
      return NextResponse.json(
        { success: false, error: "No working days available in the selected date range" },
        { status: 400 },
      )
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS leave_balances (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_type VARCHAR(50) NOT NULL,
          year INTEGER NOT NULL,
          total_leaves INTEGER DEFAULT 12,
          remaining_leaves INTEGER DEFAULT 12,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, user_type, year)
        )
      `

      await sql`
        CREATE TABLE IF NOT EXISTS leave_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_type VARCHAR(50) NOT NULL,
          leave_type VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          total_days INTEGER NOT NULL,
          reason TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          reviewed_by_course_admin_id INTEGER,
          reviewed_by_super_admin_id INTEGER,
          rejection_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      console.log("[MYT] Tables created/verified successfully")
    } catch (tableError: any) {
      console.error("[MYT] Error creating tables:", tableError.message)
      console.error("[MYT] Table error stack:", tableError.stack)
      // Continue anyway - tables might already exist
    }

    // Check leave balance
    const currentYear = new Date().getFullYear()
    console.log("[MYT] Checking leave balance for:", { userId, userType, currentYear })

    let balance = await sql`
      SELECT * FROM leave_balances 
      WHERE user_id = ${Number.parseInt(userId)}
      AND user_type = ${userType} 
      AND year = ${currentYear}
    `

    console.log("[MYT] Balance query result:", balance)

    if (balance.length === 0) {
      // Create balance entry if doesn't exist
      console.log("[MYT] Creating new balance entry")
      await sql`
        INSERT INTO leave_balances (user_id, user_type, year, total_leaves, remaining_leaves)
        VALUES (${Number.parseInt(userId)}, ${userType}, ${currentYear}, 12, 12)
      `

      balance = await sql`
        SELECT * FROM leave_balances 
        WHERE user_id = ${Number.parseInt(userId)}
        AND user_type = ${userType} 
        AND year = ${currentYear}
      `
    }

    const currentBalance = balance[0]
    console.log("[MYT] Current balance:", currentBalance)

    if (currentBalance.remaining_leaves < totalDays) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient leave balance. You have ${currentBalance.remaining_leaves} days remaining.`,
        },
        { status: 400 },
      )
    }

    // Create leave request
    console.log("[MYT] Creating leave request with params:", {
      userId: Number.parseInt(userId),
      userType,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
    })

    const result = await sql`
      INSERT INTO leave_requests 
        (user_id, user_type, leave_type, start_date, end_date, total_days, reason, status)
      VALUES 
        (${Number.parseInt(userId)}, ${userType}, ${leaveType}, ${startDate}, ${endDate}, ${totalDays}, ${reason}, 'pending')
      RETURNING *
    `

    console.log("[MYT] Leave request created successfully:", result[0])

    return NextResponse.json(
      { success: true, leave: result[0] },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    )
  } catch (error: any) {
    console.error("[MYT] Error applying for leave:", error)
    console.error("[MYT] Error stack:", error.stack)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
