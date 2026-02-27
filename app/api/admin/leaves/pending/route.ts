import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminRole = searchParams.get("role")
    const filterRole = searchParams.get("filterRole")

    console.log("[MYT] Pending leaves API called with adminRole:", adminRole, "filterRole:", filterRole)

    if (!adminRole) {
      return NextResponse.json({ success: false, error: "Admin role is required" }, { status: 400 })
    }

    let leaves

    if (adminRole === "course_admin") {
      console.log("[MYT] Fetching tutor leaves for course admin")
      leaves = await sql`
        SELECT 
          lr.*,
          t.name as user_name,
          t.department,
          ca.username as course_admin_name,
          sa.username as super_admin_name
        FROM leave_requests lr
        INNER JOIN tutors t ON lr.user_id = t.id AND lr.user_type = 'tutor'
        LEFT JOIN admins ca ON lr.reviewed_by_course_admin_id = ca.id
        LEFT JOIN admins sa ON lr.reviewed_by_super_admin_id = sa.id
        WHERE lr.status IN ('pending', 'forwarded')
        ORDER BY lr.created_at DESC
      `
      console.log("[MYT] Course admin leaves count:", leaves?.length)
    } else if (adminRole === "admin_personnel" || adminRole === "technical") {
      console.log("[MYT] Fetching peon leaves for admin personnel or technical")
      leaves = await sql`
        SELECT 
          lr.*,
          ph.name as user_name,
          sa.username as super_admin_name
        FROM leave_requests lr
        INNER JOIN peon_housekeeping_users ph ON lr.user_id = ph.id AND lr.user_type = 'peon'
        LEFT JOIN admins sa ON lr.reviewed_by_super_admin_id = sa.id
        WHERE lr.status = 'pending'
        ORDER BY lr.created_at DESC
      `
      console.log("[MYT] Peon leaves count:", leaves?.length)
    } else if (adminRole === "super_admin") {
      console.log("[MYT] Fetching leaves for super admin")

      leaves = await sql`
        SELECT 
          lr.*,
          COALESCE(t.name, tt.name, ap.name, ph.name) as user_name,
          t.department,
          ca.username as course_admin_name,
          sa.username as super_admin_name
        FROM leave_requests lr
        LEFT JOIN tutors t ON lr.user_id = t.id AND lr.user_type = 'tutor'
        LEFT JOIN technical_team_users tt ON lr.user_id = tt.id AND lr.user_type = 'technical'
        LEFT JOIN administrative_personnel ap ON lr.user_id = ap.id AND lr.user_type = 'admin_personnel'
        LEFT JOIN peon_housekeeping_users ph ON lr.user_id = ph.id AND lr.user_type = 'peon'
        LEFT JOIN admins ca ON lr.reviewed_by_course_admin_id = ca.id
        LEFT JOIN admins sa ON lr.reviewed_by_super_admin_id = sa.id
        WHERE lr.status IN ('pending', 'forwarded')
        ORDER BY lr.created_at DESC
      `
      console.log("[MYT] All pending/forwarded leaves count:", leaves?.length)

      if (filterRole) {
        leaves = leaves.filter((leave: any) => leave.user_type === filterRole)
        console.log("[MYT] Filtered leaves by role", filterRole, "count:", leaves?.length)
      }
    }

    console.log("[MYT] Final leaves being returned:", leaves?.length)
    return NextResponse.json({ success: true, leaves: leaves || [] })
  } catch (error: any) {
    console.error("[MYT] Error fetching pending leaves:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
