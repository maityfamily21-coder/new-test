import { NextRequest, NextResponse } from "next/server"
import { 
  findNearestCampus, 
  CAMPUS_LOCATIONS,
  formatDistance 
} from "@/lib/attendance-config"

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

export async function POST(request: NextRequest) {
  try {
    const { tutorId, latitude, longitude } = await request.json()

    // Validate required fields
    if (!tutorId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Tutor ID and location coordinates are required" 
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
    const rateLimitKey = `tutor_${tutorId}_verify_location`
    if (!checkRateLimit(rateLimitKey, 30, 60000)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Too many location verification requests. Please wait." 
        },
        { status: 429 },
      )
    }

    // Find all nearby campuses
    const campuses = findNearestCampus(latitude, longitude)

    // Find the nearest and inside campus
    const nearestCampus = campuses[0]
    const insideCampus = campuses.find((c) => c.isInside)

    return NextResponse.json({
      success: true,
      currentLocation: {
        latitude,
        longitude,
      },
      locationStatus: {
        isInside: insideCampus ? true : false,
        message: insideCampus 
          ? `Inside ${insideCampus.name}` 
          : `Outside authorized areas (Nearest: ${nearestCampus?.name})`,
      },
      nearestCampus: {
        name: nearestCampus?.name || "Unknown",
        distance: Math.round(nearestCampus?.distance || 0),
        distanceFormatted: formatDistance(nearestCampus?.distance || 0),
        isInside: nearestCampus?.isInside || false,
        authorized: nearestCampus?.isInside || false,
      },
      allCampuses: campuses.map((campus) => ({
        id: campus.id,
        name: campus.name,
        latitude: campus.latitude,
        longitude: campus.longitude,
        radius: campus.radius,
        distance: Math.round(campus.distance),
        distanceFormatted: formatDistance(campus.distance),
        isInside: campus.isInside,
      })),
      eligibilityCheck: {
        canMarkAttendance: insideCampus ? true : false,
        reason: insideCampus 
          ? "You are in an authorized area" 
          : `You are ${Math.round(nearestCampus?.distance || 0)}m away from the nearest authorized area`,
      },
    })
  } catch (error) {
    console.error("[Tutor Attendance] Error verifying location:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, message: `Failed to verify location: ${errorMessage}` },
      { status: 500 },
    )
  }
}
