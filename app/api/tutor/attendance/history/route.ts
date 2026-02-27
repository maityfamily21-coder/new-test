import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const tutorId = request.nextUrl.searchParams.get("tutorId")
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10")
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0")
    const startDate = request.nextUrl.searchParams.get("startDate")
    const endDate = request.nextUrl.searchParams.get("endDate")
    const month = request.nextUrl.searchParams.get("month") // Format: YYYY-MM
    const year = request.nextUrl.searchParams.get("year") // Format: YYYY

    if (!tutorId) {
      return NextResponse.json(
        { success: false, message: "Tutor ID is required" },
        { status: 400 }
      )
    }

    const tutorIdNum = parseInt(tutorId)

    // Get total count for the tutor
    const countResult = await sql`
      SELECT COUNT(*) as total 
      FROM tutor_attendance 
      WHERE tutor_id = ${tutorIdNum}
    `

    const total = countResult[0].total

    // Get paginated records with proper pagination
    let records: any[] = []
    
    if (total > 0) {
      records = await sql`
        SELECT 
          id,
          tutor_id,
          attendance_date,
          marked_at,
          latitude,
          longitude,
          campus_location,
          attendance_type,
          user_agent,
          location_verified,
          status,
          created_at
        FROM tutor_attendance 
        WHERE tutor_id = ${tutorIdNum}
        ORDER BY attendance_date DESC, marked_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    }

    // Get daily summary stats
    let dailySummary: any[] = []
    
    if (total > 0) {
      dailySummary = await sql`
        SELECT 
          attendance_date,
          COUNT(*) as marks_count,
          MIN(marked_at) as first_mark,
          MAX(marked_at) as last_mark,
          STRING_AGG(DISTINCT campus_location, ', ') as campuses_used
        FROM tutor_attendance 
        WHERE tutor_id = ${tutorIdNum}
        GROUP BY attendance_date
        ORDER BY attendance_date DESC
        LIMIT 30
      `
    }

    // Calculate stats
    const totalDays = dailySummary.length
    const completedDays = dailySummary.filter((day: any) => day.marks_count >= 2).length
    const partialDays = dailySummary.filter((day: any) => day.marks_count === 1).length
    const completionPercentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0

    return NextResponse.json({
      success: true,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1,
      },
      statistics: {
        totalDays,
        completedDays,
        partialDays,
        completionPercentage,
        totalMarks: total,
      },
      records: records.map((record: any) => ({
        id: record.id,
        date: record.attendance_date,
        type: record.attendance_type,
        markedAt: record.marked_at,
        campus: record.campus_location,
        location: {
          latitude: record.latitude,
          longitude: record.longitude,
        },
        verified: record.location_verified,
        status: record.status,
      })),
      dailySummary: dailySummary.map((day: any) => ({
        date: day.attendance_date,
        marksCount: day.marks_count,
        isComplete: day.marks_count >= 2,
        firstMark: day.first_mark,
        lastMark: day.last_mark,
        campuses: day.campuses_used ? day.campuses_used.split(", ") : [],
      })),
    })
  } catch (error) {
    console.error("[Tutor Attendance] Error fetching history:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, message: `Failed to fetch attendance history: ${errorMessage}` },
      { status: 500 }
    )
  }
}
