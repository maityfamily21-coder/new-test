import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashDeviceFingerprint } from "@/lib/device-fingerprint"

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
    const tutorId = request.nextUrl.searchParams.get("tutorId")
    const deviceFingerprint = request.nextUrl.searchParams.get("deviceFingerprint")

    if (!tutorId || !deviceFingerprint) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Tutor ID and device fingerprint are required" 
        },
        { status: 400 },
      )
    }

    // Rate limiting check
    const rateLimitKey = `tutor_${tutorId}_device_info`
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Too many requests. Please wait before trying again." 
        },
        { status: 429 },
      )
    }

    const hashedFingerprint = hashDeviceFingerprint(deviceFingerprint)
    const today = new Date().toISOString().split("T")[0]

    // Check if device has been used today
    const deviceUsageToday = await sql`
      SELECT 
        id,
        marked_at,
        attendance_type,
        campus_location,
        latitude,
        longitude
      FROM tutor_attendance 
      WHERE device_fingerprint = ${hashedFingerprint}
        AND attendance_date = ${today}
      ORDER BY marked_at ASC
    `

    // Get device usage history (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const recentUsage = await sql`
      SELECT 
        attendance_date,
        COUNT(*) as marks_count,
        STRING_AGG(DISTINCT campus_location, ', ') as campuses
      FROM tutor_attendance 
      WHERE device_fingerprint = ${hashedFingerprint}
        AND attendance_date >= ${sevenDaysAgo}
      GROUP BY attendance_date
      ORDER BY attendance_date DESC
    `

    // Get all-time device stats
    const allTimeStats = await sql`
      SELECT 
        COUNT(*) as total_marks,
        COUNT(DISTINCT attendance_date) as days_used,
        MIN(created_at) as first_used,
        MAX(created_at) as last_used
      FROM tutor_attendance 
      WHERE device_fingerprint = ${hashedFingerprint}
    `

    const stats = allTimeStats[0]

    return NextResponse.json({
      success: true,
      device: {
        fingerprint: deviceFingerprint.substring(0, 10) + "...", // Truncate for security
        hashedFingerprint: hashedFingerprint.substring(0, 10) + "...", // Truncate for security
        type: "unknown", // Could be detected more specifically
      },
      todayStatus: {
        usedToday: deviceUsageToday.length > 0,
        marksToday: deviceUsageToday.length,
        maxAllowed: 1,
        canUseToday: deviceUsageToday.length === 0,
        marks: deviceUsageToday.map((mark: any) => ({
          type: mark.attendance_type,
          markedAt: mark.marked_at,
          campus: mark.campus_location,
          location: {
            latitude: mark.latitude,
            longitude: mark.longitude,
          },
        })),
      },
      recentUsage: {
        lastSevenDays: recentUsage.map((usage: any) => ({
          date: usage.attendance_date,
          marksCount: usage.marks_count,
          campuses: usage.campuses ? usage.campuses.split(", ") : [],
        })),
      },
      statistics: {
        totalMarks: parseInt(stats.total_marks) || 0,
        daysUsed: parseInt(stats.days_used) || 0,
        firstUsed: stats.first_used || null,
        lastUsed: stats.last_used || null,
        averageMarksPerDay: stats.days_used 
          ? (parseInt(stats.total_marks) / parseInt(stats.days_used)).toFixed(2)
          : 0,
      },
      warning: deviceUsageToday.length > 0 
        ? "This device has already been used for attendance today. Another attendance mark cannot be made from this device."
        : null,
    })
  } catch (error) {
    console.error("[Tutor Attendance] Error fetching device info:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, message: `Failed to fetch device info: ${errorMessage}` },
      { status: 500 },
    )
  }
}
