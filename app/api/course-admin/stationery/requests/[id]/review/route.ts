import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateCourseAdminAuth, createCourseAdminUnauthorizedResponse } from "@/lib/course-admin-auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handleReview(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return handleReview(request, params)
}

async function handleReview(request: NextRequest, { id: paramId }: { id: string }) {
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
    const requestId = Number.parseInt(paramId)
    const body = await request.json()
    const { action, reason } = body

    if (!action || !["forward", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'forward' or 'reject'" },
        { status: 400 },
      )
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required when rejecting a request" },
        { status: 400 },
      )
    }

    // Get request details and verify it belongs to an assigned tutor
    const requestDetails = await sql`
      SELECT 
        sr.id,
        sr.status,
        sr.requester_id,
        sr.requester_type,
        t.name as tutor_name,
        ts.subject_id
      FROM stationery_requests sr
      LEFT JOIN tutors t ON sr.requester_id = t.id AND sr.requester_type = 'tutor'
      LEFT JOIN tutor_subjects ts ON t.id = ts.tutor_id
      WHERE sr.id = ${requestId} AND sr.status = 'pending_approval' AND sr.requester_type = 'tutor'
    `

    if (requestDetails.length === 0) {
      return NextResponse.json({ success: false, error: "Request not found or already reviewed" }, { status: 404 })
    }

    const req = requestDetails[0]

    if (authResult.admin.role !== "super_admin") {
      // Verify the tutor is assigned to one of the course admin's courses
      const courseCheck = await sql`
        SELECT COUNT(*) as count
        FROM tutor_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        WHERE ts.tutor_id = ${req.requester_id} 
          AND s.course_id = ANY(${authResult.admin.assigned_course_ids})
        LIMIT 1
      `

      if (courseCheck[0].count === 0) {
        return NextResponse.json(
          { success: false, error: "You do not have access to this tutor's requests" },
          { status: 403 },
        )
      }
    }

    // Update the request status
    const newStatus = action === "forward" ? "forwarded" : "rejected"
    const result = await sql`
      UPDATE stationery_requests
      SET 
        status = ${newStatus},
        reviewed_by_course_admin_id = ${authResult.admin.id},
        reviewed_by_course_admin_at = NOW(),
        admin_notes = ${action === "reject" ? reason : null}
      WHERE id = ${requestId} AND status = 'pending_approval'
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Failed to update request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action === "forward" ? "forwarded" : "rejected"} successfully`,
      request: {
        id: result[0].id,
        status: result[0].status,
        reviewedBy: result[0].reviewed_by_course_admin_id,
        reviewedAt: result[0].reviewed_by_course_admin_at,
      },
    })
  } catch (error) {
    console.error("Error reviewing stationery request:", error)
    return NextResponse.json({ success: false, error: "Failed to review request" }, { status: 500 })
  }
}
