import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { ATTENDANCE_LIMITS, findNearestCampus } from "@/lib/attendance-config"

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || record.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count < maxRequests) {
    record.count++
    return true
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    const personnelId = request.nextUrl.searchParams.get("personnelId")
    const userType = request.nextUrl.searchParams.get("userType")
    const latitude = request.nextUrl.searchParams.get("latitude")
    const longitude = request.nextUrl.searchParams.get("longitude")

    if (!personnelId || !userType) {
      return NextResponse.json(
        { success: false, message: "Personnel ID and user type are required" },
        { status: 400 }
      )
    }

    // Rate limiting check
    const rateLimitKey = `${userType}_${personnelId}_status`
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please wait before trying again.",
        },
        { status: 429 }
      )
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0]

    // Get all attendance records for today (ordered by time)
    const todayAttendances = await sql`
      SELECT 
        id, 
        marked_at, 
        latitude, 
        longitude, 
        status,
        attendance_type,
        campus_location,
        device_fingerprint
      FROM personnel_attendance 
      WHERE user_id = ${parseInt(personnelId)} 
        AND user_type = ${userType}
        AND attendance_date = ${today}
      ORDER BY marked_at ASC
    `

    // Determine current status
    let statusText = "Not Marked"
    let canMarkAttendance = true
    let reason = ""

    if (todayAttendances.length === ATTENDANCE_LIMITS.MAX_PER_DAY) {
      statusText = "Completed"
      canMarkAttendance = false
      reason = "Maximum attendance marks for today reached"
    } else if (todayAttendances.length === 1) {
      statusText = "Marked Once"
    } else if (todayAttendances.length >= ATTENDANCE_LIMITS.MAX_PER_DAY) {
      statusText = "Completed"
      canMarkAttendance = false
      reason = "Attendance limit exceeded"
    }

    // Check if inside authorized area
    let isInAuthorizedArea = false
    let nearestCampusInfo = null
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lon = parseFloat(longitude)
      if (!isNaN(lat) && !isNaN(lon)) {
        const campuses = findNearestCampus(lat, lon)
        if (campuses.length > 0) {
          nearestCampusInfo = {
            name: campuses[0].name,
            distance: Math.round(campuses[0].distance),
            isInside: campuses[0].isInside,
          }
          isInAuthorizedArea = campuses[0].isInside
        }
      }
    }

    return NextResponse.json({
      success: true,
      statusSummary: {
        text: statusText,
        marksToday: todayAttendances.length,
        maxAllowed: ATTENDANCE_LIMITS.MAX_PER_DAY,
        remainingMarks: Math.max(0, ATTENDANCE_LIMITS.MAX_PER_DAY - todayAttendances.length),
        canMark: canMarkAttendance && isInAuthorizedArea,
        reason: reason || (canMarkAttendance ? "" : "Cannot mark attendance"),
      },
      locationStatus: {
        isInside: isInAuthorizedArea,
        campusInfo: nearestCampusInfo,
      },
      attendanceMarks: todayAttendances.map((mark: any) => ({
        id: mark.id,
        type: mark.attendance_type,
        markedAt: mark.marked_at,
        campus: mark.campus_location,
        location: {
          latitude: mark.latitude,
          longitude: mark.longitude,
        },
      })),
      details: {
        date: today,
        totalMarked: todayAttendances.length,
        firstMark: todayAttendances.length > 0 ? todayAttendances[0].marked_at : null,
        lastMark: todayAttendances.length > 0 ? todayAttendances[todayAttendances.length - 1].marked_at : null,
      },
    })
  } catch (error) {
    console.error("[Personnel Attendance] Error fetching status:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch attendance status" },
      { status: 500 }
    )
  }
}
