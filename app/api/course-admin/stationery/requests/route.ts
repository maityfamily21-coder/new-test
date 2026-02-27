import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateCourseAdminAuth, createCourseAdminUnauthorizedResponse } from "@/lib/course-admin-auth"

// GET: Retrieve pending tutor stationery requests for course admin
export async function GET(request: NextRequest) {
  const authResult = await validateCourseAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createCourseAdminUnauthorizedResponse()
  }

  if (authResult.admin.role !== "super_admin" && authResult.admin.role !== "course_admin") {
    return NextResponse.json(
      { success: false, error: "Only admins can review tutor stationery requests" },
      { status: 403 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending_approval"

    let tutorIds: any[] = []

    if (authResult.admin.role === "super_admin") {
      // Super admin can see all tutors
      const allTutors = await sql`
        SELECT DISTINCT id FROM tutors
      `
      tutorIds = allTutors.map((row) => row.id)
    } else {
      // Course admin can only see tutors assigned to their courses
      const assignedTutors = await sql`
        SELECT DISTINCT t.id
        FROM tutors t
        JOIN tutor_subjects ts ON t.id = ts.tutor_id
        JOIN subjects s ON ts.subject_id = s.id
        WHERE s.course_id = ANY(${authResult.admin.assigned_course_ids})
      `
      tutorIds = assignedTutors.map((row) => row.id)
    }

    if (tutorIds.length === 0) {
      return NextResponse.json({
        success: true,
        requests: [],
      })
    }

    let requests
    if (status === "all") {
      requests = await sql`
        SELECT 
          sr.id,
          sr.requester_id,
          sr.requester_type,
          sr.requester_name,
          sr.status,
          sr.created_at,
          sr.reason as purpose,
          sr.reviewed_by_course_admin_id,
          sr.reviewed_by_course_admin_at,
          sr.admin_notes as rejection_reason,
          si.name,
          si.unit,
          si.available_quantity,
          sri.quantity
        FROM stationery_requests sr
        JOIN stationery_request_items sri ON sri.request_id = sr.id
        JOIN stationery_inventory si ON sri.item_id = si.id
        WHERE sr.requester_type = 'tutor' 
          AND sr.requester_id = ANY(${tutorIds})
        ORDER BY 
          CASE sr.status 
            WHEN 'pending_approval' THEN 1 
            WHEN 'forwarded' THEN 2 
            WHEN 'approved' THEN 3 
            WHEN 'rejected' THEN 4 
          END,
          sr.created_at DESC
      `
    } else {
      requests = await sql`
        SELECT 
          sr.id,
          sr.requester_id,
          sr.requester_type,
          sr.requester_name,
          sr.status,
          sr.created_at,
          sr.reason as purpose,
          sr.reviewed_by_course_admin_id,
          sr.reviewed_by_course_admin_at,
          sr.admin_notes as rejection_reason,
          si.name,
          si.unit,
          si.available_quantity,
          sri.quantity
        FROM stationery_requests sr
        JOIN stationery_request_items sri ON sri.request_id = sr.id
        JOIN stationery_inventory si ON sri.item_id = si.id
        WHERE sr.requester_type = 'tutor' 
          AND sr.requester_id = ANY(${tutorIds})
          AND sr.status = ${status}
        ORDER BY sr.created_at DESC
      `
    }

    return NextResponse.json({
      success: true,
      requests: requests.map((req) => ({
        id: req.id,
        requester_name: req.requester_name,
        requester_type: req.requester_type,
        name: req.name,
        unit: req.unit,
        quantity: req.quantity,
        available_quantity: req.available_quantity,
        status: req.status,
        created_at: req.created_at,
        purpose: req.purpose,
        reviewed_by_course_admin_id: req.reviewed_by_course_admin_id,
        reviewed_by_course_admin_at: req.reviewed_by_course_admin_at,
        rejection_reason: req.rejection_reason,
      })),
    })
  } catch (error) {
    console.error("Error fetching course admin stationery requests:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch requests" }, { status: 500 })
  }
}
