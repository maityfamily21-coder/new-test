import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const userType = searchParams.get("userType")

    console.log("[MYT] Fetching leaves for userId:", userId, "userType:", userType)

    if (!userId || !userType) {
      return NextResponse.json({ success: false, error: "User ID and type are required" }, { status: 400 })
    }

    try {
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
      console.log("[MYT] Tables verified/created")
    } catch (tableError: any) {
      console.error("[MYT] Error creating tables:", tableError.message)
    }

    const leaves = await sql`
      SELECT 
        lr.*,
        ca.username as course_admin_name,
        sa.username as super_admin_name
      FROM leave_requests lr
      LEFT JOIN admins ca ON lr.reviewed_by_course_admin_id = ca.id
      LEFT JOIN admins sa ON lr.reviewed_by_super_admin_id = sa.id
      WHERE lr.user_id = ${Number.parseInt(userId)}
      AND lr.user_type = ${userType}
      ORDER BY lr.created_at DESC
    `

    console.log("[MYT] Fetched leaves count:", leaves.length)

    // Get leave balance
    const currentYear = new Date().getFullYear()
    let balance = await sql`
      SELECT * FROM leave_balances 
      WHERE user_id = ${Number.parseInt(userId)}
      AND user_type = ${userType}
      AND year = ${currentYear}
    `

    if (balance.length === 0) {
      console.log("[MYT] Creating new balance entry for user")
      await sql`
        INSERT INTO leave_balances (user_id, user_type, year)
        VALUES (${Number.parseInt(userId)}, ${userType}, ${currentYear})
      `
      balance = await sql`
        SELECT * FROM leave_balances 
        WHERE user_id = ${Number.parseInt(userId)}
        AND user_type = ${userType}
        AND year = ${currentYear}
      `
    }

    console.log("[MYT] Leave balance from DB:", balance[0])

    const balanceData = balance[0]
    const formattedBalance = {
      total_leaves: balanceData.total_leaves,
      used_leaves: balanceData.total_leaves - balanceData.remaining_leaves,
      remaining_leaves: balanceData.remaining_leaves,
    }

    console.log("[MYT] Formatted balance:", formattedBalance)

    return NextResponse.json(
      {
        success: true,
        leaves: leaves,
        balance: formattedBalance,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error: any) {
    console.error("[MYT] Error fetching leaves:", error)
    console.error("[MYT] Error stack:", error.stack)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
