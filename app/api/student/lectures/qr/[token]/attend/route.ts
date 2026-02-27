import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { randomUUID } from "crypto"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const { studentId, deviceInfo } = await request.json()

    // Convert studentId to number if it's a string
    const studentIdNum = parseInt(String(studentId), 10)

    if (!studentIdNum || isNaN(studentIdNum) || !token) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid studentId or token" },
        { status: 400 }
      )
    }

    // Extract IP and user agent
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ""
    const userAgent = request.headers.get("user-agent") || ""

    // Lookup token with proper error handling
    let tokenRows
    try {
      tokenRows = await sql`
        SELECT lecture_id, COALESCE(active, TRUE) AS active, created_at
        FROM lecture_qr_tokens
        WHERE token = ${token}
        LIMIT 1
      `
    } catch (tableErr: any) {
      console.error("[v0] Error querying lecture_qr_tokens table:", tableErr?.message || tableErr)
      return NextResponse.json(
        { success: false, error: `Token lookup failed: ${tableErr?.message || "Unknown error"}` },
        { status: 500 }
      )
    }

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired QR code" },
        { status: 404 }
      )
    }

    const tokenRow = tokenRows[0]
    const lectureId = Number(tokenRow.lecture_id)
    const createdAt = new Date(tokenRow.created_at)
    const isFresh = Date.now() - createdAt.getTime() <= 4000 // 4 second window

    if (!isFresh) {
      return NextResponse.json(
        { success: false, error: "QR code expired. Please ask your tutor to display a fresh QR code" },
        { status: 400 }
      )
    }

    if (!tokenRow.active) {
      return NextResponse.json(
        { success: false, error: "Attendance collection is closed for this lecture" },
        { status: 403 }
      )
    }

    // Get lecture details and course info
    let lectureRows
    try {
      lectureRows = await sql`
        SELECT l.id, l.title, l.subject_id, s.name as subject_name, s.code, s.course_id, s.semester, c.name as course_name
        FROM lectures l
        JOIN subjects s ON l.subject_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE l.id = ${lectureId}
      `
    } catch (err: any) {
      console.error("[v0] Error fetching lecture details:", err?.message || err)
      return NextResponse.json(
        { success: false, error: `Lecture lookup failed: ${err?.message || "Unknown error"}` },
        { status: 500 }
      )
    }

    if (!lectureRows || lectureRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lecture not found" },
        { status: 404 }
      )
    }

    const lectureData = lectureRows[0]

    // Verify student is enrolled in this course/semester
    let enrollmentRows
    try {
      enrollmentRows = await sql`
        SELECT id FROM students
        WHERE id = ${studentIdNum} AND course_id = ${lectureData.course_id} AND current_semester = ${lectureData.semester}
        LIMIT 1
      `
    } catch (err: any) {
      console.error("[v0] Error checking enrollment:", err?.message || err)
      return NextResponse.json(
        { success: false, error: `Enrollment check failed: ${err?.message || "Unknown error"}` },
        { status: 500 }
      )
    }

    if (!enrollmentRows || enrollmentRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "You are not enrolled for this lecture's course/semester" },
        { status: 403 }
      )
    }

    // Check if attendance already marked for this student
    let existingRows
    try {
      existingRows = await sql`
        SELECT id FROM lecture_attendance
        WHERE lecture_id = ${lectureId} AND student_id = ${studentIdNum}
        LIMIT 1
      `
    } catch (err: any) {
      console.error("[v0] Error checking existing attendance:", err?.message || err)
      return NextResponse.json(
        { success: false, error: `Attendance check failed: ${err?.message || "Unknown error"}` },
        { status: 500 }
      )
    }

    if (existingRows && existingRows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Your attendance is already marked for this lecture" },
        { status: 409 }
      )
    }

    // Mark attendance
    try {
      const result = await sql`
        INSERT INTO lecture_attendance (lecture_id, student_id, status)
        VALUES (${lectureId}, ${studentIdNum}, 'Present')
        RETURNING id
      `
    } catch (err: any) {
      console.error("[v0] Attendance insert error:", err?.message || err)
      if (err?.message?.includes("duplicate key") || err?.code === "23505") {
        return NextResponse.json(
          { success: false, error: "Your attendance is already marked for this lecture" },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: `Failed to mark attendance: ${err?.message || "Unknown error"}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Attendance marked successfully! Your attendance has been recorded.",
        lectureName: lectureData.title,
        subjectName: lectureData.subject_name,
        courseCode: lectureData.code,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[v0] Student lecture QR attend error:", error?.message || error)
    return NextResponse.json(
      { success: false, error: `Server error: ${error?.message || "Unknown error"}` },
      { status: 500 }
    )
  }
}
