import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leaveId, action, adminId, adminRole, rejectionReason } = body

    if (!leaveId || !action || !adminId || !adminRole) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const leave = await sql`SELECT * FROM leave_requests WHERE id = ${leaveId}`
    if (leave.length === 0) {
      return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 })
    }

    const leaveRequest = leave[0]

    if (adminRole === "course_admin") {
      // Course admin can only forward or reject tutor leaves
      if (leaveRequest.user_type !== "tutor") {
        return NextResponse.json(
          { success: false, error: "Course admins can only review tutor leaves" },
          { status: 403 },
        )
      }

      if (action === "forward") {
        await sql`
          UPDATE leave_requests 
          SET status = 'forwarded',
              reviewed_by_course_admin_id = ${adminId},
              reviewed_by_course_admin_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${leaveId}
        `
      } else if (action === "reject") {
        await sql`
          UPDATE leave_requests 
          SET status = 'rejected',
              reviewed_by_course_admin_id = ${adminId},
              reviewed_by_course_admin_at = CURRENT_TIMESTAMP,
              rejection_reason = ${rejectionReason || "Rejected by course admin"},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${leaveId}
        `
      }
    } else if (adminRole === "admin_personnel" || adminRole === "technical") {
      if (leaveRequest.user_type !== "peon") {
        return NextResponse.json(
          {
            success: false,
            error: `${adminRole === "admin_personnel" ? "Admin Personnel" : "Technical Team"} can only review peon leaves`,
          },
          { status: 403 },
        )
      }

      if (action === "approve") {
        const currentYear = new Date().getFullYear()

        // Check if balance exists and has enough remaining leaves
        const balanceCheck = await sql`
          SELECT * FROM leave_balances
          WHERE user_id = ${leaveRequest.user_id}
          AND user_type = 'peon'
          AND year = ${currentYear}
        `

        if (balanceCheck.length === 0) {
          // Create balance if doesn't exist
          await sql`
            INSERT INTO leave_balances (user_id, user_type, year)
            VALUES (${leaveRequest.user_id}, 'peon', ${currentYear})
          `
        }

        await sql`
          UPDATE leave_balances
          SET used_leaves = used_leaves + ${leaveRequest.total_days},
              remaining_leaves = total_leaves - (used_leaves + ${leaveRequest.total_days}),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${leaveRequest.user_id}
          AND user_type = 'peon'
          AND year = ${currentYear}
        `

        await sql`
          UPDATE leave_requests 
          SET status = 'approved',
              reviewed_by_super_admin_id = ${adminId},
              reviewed_by_super_admin_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${leaveId}
        `
      } else if (action === "reject") {
        await sql`
          UPDATE leave_requests 
          SET status = 'rejected',
              reviewed_by_super_admin_id = ${adminId},
              reviewed_by_super_admin_at = CURRENT_TIMESTAMP,
              rejection_reason = ${rejectionReason || `Rejected by ${adminRole === "admin_personnel" ? "admin personnel" : "technical team"}`},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${leaveId}
        `
      }
    } else if (adminRole === "super_admin") {
      // Super admin can approve or reject any leave
      if (action === "approve") {
        const currentYear = new Date().getFullYear()

        // Check if balance exists and has enough remaining leaves
        const balanceCheck = await sql`
          SELECT * FROM leave_balances
          WHERE user_id = ${leaveRequest.user_id}
          AND user_type = ${leaveRequest.user_type}
          AND year = ${currentYear}
        `

        if (balanceCheck.length === 0) {
          // Create balance if doesn't exist
          await sql`
            INSERT INTO leave_balances (user_id, user_type, year)
            VALUES (${leaveRequest.user_id}, ${leaveRequest.user_type}, ${currentYear})
          `
        }

        await sql`
          UPDATE leave_balances
          SET used_leaves = used_leaves + ${leaveRequest.total_days},
              remaining_leaves = total_leaves - (used_leaves + ${leaveRequest.total_days}),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${leaveRequest.user_id}
          AND user_type = ${leaveRequest.user_type}
          AND year = ${currentYear}
        `

        await sql`
          UPDATE leave_requests 
          SET status = 'approved',
              reviewed_by_super_admin_id = ${adminId},
              reviewed_by_super_admin_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${leaveId}
        `
      } else if (action === "reject") {
        await sql`
          UPDATE leave_requests 
          SET status = 'rejected',
              reviewed_by_super_admin_id = ${adminId},
              reviewed_by_super_admin_at = CURRENT_TIMESTAMP,
              rejection_reason = ${rejectionReason || "Rejected by super admin"},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${leaveId}
        `
      }
    }

    return NextResponse.json({ success: true, message: "Leave request updated successfully" })
  } catch (error: any) {
    console.error("Error reviewing leave:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
