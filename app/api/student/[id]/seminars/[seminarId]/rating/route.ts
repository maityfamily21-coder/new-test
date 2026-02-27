import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"
import { parseISTDate } from "@/lib/time"

export async function POST(request: NextRequest, { params }: { params: { id: string; seminarId: string } }) {
  try {
    const authResult = await validateStudentAuth(request)
    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const authenticatedStudent = authResult.student
    const requestedStudentId = Number.parseInt(params.id)

    if (!authenticatedStudent || authenticatedStudent.id !== requestedStudentId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only rate seminars for your own account" },
        { status: 403 },
      )
    }

    const studentId = requestedStudentId
    const seminarId = Number.parseInt(params.seminarId)
    const { rating, comment } = await request.json()

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: "Rating must be between 1 and 5 stars" }, { status: 400 })
    }

    // Check if student attended the seminar (status = 'Present')
    const [attendance] = await sql`
      SELECT status 
      FROM seminar_attendance 
      WHERE seminar_id = ${seminarId} AND student_id = ${studentId}
    `

    if (!attendance || attendance.status !== "Present") {
      return NextResponse.json({ success: false, message: "You can only rate seminars you attended" }, { status: 403 })
    }

    // Check if seminar exists and is in the past
    const [seminar] = await sql`
      SELECT seminar_date 
      FROM seminars 
      WHERE id = ${seminarId}
    `

    if (!seminar) {
      return NextResponse.json({ success: false, message: "Seminar not found" }, { status: 404 })
    }

    // Ensure we compare the seminar time as IST against current time
    if (parseISTDate(seminar.seminar_date) > new Date()) {
      return NextResponse.json({ success: false, message: "You can only rate completed seminars" }, { status: 400 })
    }

    // Enforce one-time rating: prevent updates if a rating already exists
    const [existing] = await sql`
      SELECT id 
      FROM seminar_ratings 
      WHERE seminar_id = ${seminarId} AND student_id = ${studentId}
    `
    if (existing) {
      return NextResponse.json({ success: false, message: "You have already rated this seminar" }, { status: 409 })
    }

    await sql`
      INSERT INTO seminar_ratings (seminar_id, student_id, rating, comment)
      VALUES (${seminarId}, ${studentId}, ${rating}, ${comment || null})
    `

    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
    })
  } catch (error) {
    console.error("Rating submission error:", error)
    return NextResponse.json({ success: false, message: "Failed to submit rating" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string; seminarId: string } }) {
  try {
    const authResult = await validateStudentAuth(request)
    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const authenticatedStudent = authResult.student
    const requestedStudentId = Number.parseInt(params.id)

    if (!authenticatedStudent || authenticatedStudent.id !== requestedStudentId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You can only view your own ratings" },
        { status: 403 },
      )
    }

    const studentId = requestedStudentId
    const seminarId = Number.parseInt(params.seminarId)

    // Get student's rating for this seminar
    const [rating] = await sql`
      SELECT rating, comment, created_at, updated_at
      FROM seminar_ratings
      WHERE seminar_id = ${seminarId} AND student_id = ${studentId}
    `

    return NextResponse.json({
      success: true,
      rating: rating || null,
    })
  } catch (error) {
    console.error("Rating fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch rating" }, { status: 500 })
  }
}
