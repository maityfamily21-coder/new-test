import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log("[MYT] Fetching PC requests for technical team...")

    const requests = await sql`
      SELECT 
        e.id as exam_id,
        e.exam_name,
        e.exam_date,
        e.semester,
        c.name as course_name,
        json_agg(
          json_build_object(
            'subject_id', s.id,
            'subject_name', s.name,
            'request_count', (
              SELECT COUNT(*)::int
              FROM pc_requests pr
              WHERE pr.exam_id = e.id AND pr.subject_id = s.id
            )
          ) ORDER BY s.name
        ) FILTER (WHERE s.id IS NOT NULL) as subjects
      FROM exams e
      INNER JOIN courses c ON e.course_id = c.id
      INNER JOIN exam_subjects es ON e.id = es.exam_id
      INNER JOIN subjects s ON es.subject_id = s.id
      WHERE e.id IN (
        SELECT DISTINCT exam_id FROM pc_requests
      )
      GROUP BY e.id, e.exam_name, e.exam_date, e.semester, c.name
      ORDER BY e.exam_date ASC
    `

    console.log("[MYT] PC requests found:", requests.length)

    // Filter out subjects with zero requests
    const filteredRequests = requests
      .map((req) => ({
        ...req,
        subjects: (req.subjects || []).filter((subj: any) => subj.request_count > 0),
      }))
      .filter((req) => req.subjects.length > 0)

    console.log("[MYT] Filtered requests:", filteredRequests.length)

    return NextResponse.json(
      { success: true, requests: filteredRequests },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("[MYT] Error fetching PC requests:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch PC requests" }, { status: 500 })
  }
}
