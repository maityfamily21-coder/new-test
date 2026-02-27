import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { 
  CAMPUS_LOCATIONS, 
  ATTENDANCE_LIMITS, 
  calculateDistance, 
  findNearestCampus,
  getCampusName 
} from "@/lib/attendance-config"
import { hashDeviceFingerprint } from "@/lib/device-fingerprint"

// Rate limiting map (simple in-memory, consider Redis for production)
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

export async function POST(request: NextRequest) {
  try {
    const { tutorId, latitude, longitude, deviceFingerprint } = await request.json()

    // Validate required fields
    if (!tutorId || latitude === undefined || longitude === undefined || !deviceFingerprint) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Tutor ID, location coordinates, and device fingerprint are required" 
        },
        { status: 400 },
      )
    }

    // Validate coordinates are numbers
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { success: false, message: "Invalid coordinates format" },
        { status: 400 },
      )
    }

    // Rate limiting check
    const rateLimitKey = `tutor_${tutorId}_mark`
    if (!checkRateLimit(rateLimitKey, 5, 60000)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Too many requests. Please wait before trying again." 
        },
        { status: 429 },
      )
    }

    // Get client IP and user agent
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Get today's date in ISO format
    const today = new Date().toISOString().split("T")[0]

    // Find nearest campus and check if within authorized area
    const campusInfo = findNearestCampus(latitude, longitude)
    const nearestCampus = campusInfo[0]
    
    if (!nearestCampus || !nearestCampus.isInside) {
      const distance = nearestCampus?.distance || 999999
      return NextResponse.json(
        {
          success: false,
          message: "You are not in any authorized campus area. Attendance cannot be marked.",
          distance: Math.round(distance),
          nearestCampus: nearestCampus?.name || "Unknown",
        },
        { status: 403 },
      )
    }

    const campusName = nearestCampus.name
    const hashedFingerprint = hashDeviceFingerprint(deviceFingerprint)

    // Check if device is being used by a DIFFERENT tutor today (security check)
    const deviceUsageByOtherTutor = await sql`
      SELECT id, tutor_id, marked_at
      FROM tutor_attendance 
      WHERE device_fingerprint = ${hashedFingerprint} 
        AND attendance_date = ${today}
        AND tutor_id != ${tutorId}
      LIMIT 1
    `

    if (deviceUsageByOtherTutor.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This device has been used by another tutor today. One device cannot be used by multiple tutors on the same day.",
          deviceSharedWithOtherTutor: true,
          lastMarkedAt: deviceUsageByOtherTutor[0].marked_at,
        },
        { status: 403 },
      )
    }

    // Check if current tutor already marked with this device today (max 1 per device per day per tutor)
    const deviceUsageToday = await sql`
      SELECT id, marked_at, attendance_type 
      FROM tutor_attendance 
      WHERE device_fingerprint = ${hashedFingerprint} 
        AND attendance_date = ${today}
        AND tutor_id = ${tutorId}
      LIMIT 1
    `

    if (deviceUsageToday.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This device has already been used by you for attendance today. Cannot mark again with the same device.",
          alreadyMarkedByDevice: true,
          lastMarkedAt: deviceUsageToday[0].marked_at,
        },
        { status: 409 },
      )
    }

    // Check total attendance count for today (max 2 per tutor per day)
    const todayAttendance = await sql`
      SELECT id, attendance_type, marked_at
      FROM tutor_attendance 
      WHERE tutor_id = ${tutorId} 
        AND attendance_date = ${today}
      ORDER BY marked_at ASC
    `

    if (todayAttendance.length >= ATTENDANCE_LIMITS.MAX_PER_DAY) {
      return NextResponse.json(
        {
          success: false,
          message: `You have already marked attendance ${ATTENDANCE_LIMITS.MAX_PER_DAY} times today. Maximum limit reached.`,
          marksToday: todayAttendance.length,
          maxAllowed: ATTENDANCE_LIMITS.MAX_PER_DAY,
          cannotMark: true,
        },
        { status: 409 },
      )
    }

    // Determine attendance type (Entry or Exit)
    let attendanceType = "Entry"
    if (todayAttendance.length === 1) {
      attendanceType = "Exit"
    }

    // Mark attendance
    const result = await sql`
      INSERT INTO tutor_attendance 
      (
        tutor_id, 
        attendance_date, 
        marked_at, 
        latitude, 
        longitude, 
        device_fingerprint,
        campus_location,
        attendance_type,
        user_agent, 
        ip_address, 
        location_verified,
        status
      )
      VALUES (
        ${tutorId}, 
        ${today}, 
        NOW(), 
        ${latitude}, 
        ${longitude},
        ${hashedFingerprint},
        ${campusName},
        ${attendanceType},
        ${userAgent}, 
        ${ip}::inet,
        true,
        'present'
      )
      RETURNING id, tutor_id, attendance_date, marked_at, latitude, longitude, attendance_type, campus_location
    `

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "Failed to mark attendance" },
        { status: 500 },
      )
    }

    const attendance = result[0]
    const updatedCount = todayAttendance.length + 1

    return NextResponse.json({
      success: true,
      message: `${attendanceType} marked successfully at ${campusName}`,
      attendance: {
        ...attendance,
        marksToday: updatedCount,
        maxAllowed: ATTENDANCE_LIMITS.MAX_PER_DAY,
        remainingMarks: ATTENDANCE_LIMITS.MAX_PER_DAY - updatedCount,
      },
    })
  } catch (error) {
    console.error("[Tutor Attendance] Error marking attendance:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, message: `Failed to mark attendance: ${errorMessage}` },
      { status: 500 },
    )
  }
}
