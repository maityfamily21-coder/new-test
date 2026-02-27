import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id

    // Get all ratings for this seminar with student details
    const ratings = await sql`
      SELECT 
        sr.id,
        sr.rating,
        sr.comment,
        sr.created_at,
        sr.updated_at,
        s.full_name as student_name,
        s.enrollment_number,
        c.name as course_name
      FROM seminar_ratings sr
      JOIN students s ON sr.student_id = s.id
      JOIN courses c ON s.course_id = c.id
      WHERE sr.seminar_id = ${seminarId}
      ORDER BY sr.created_at DESC
    `

    // Calculate average rating
    const [avgResult] = await sql`
      SELECT 
        AVG(rating)::NUMERIC(3,2) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM seminar_ratings
      WHERE seminar_id = ${seminarId}
    `

    return NextResponse.json({
      success: true,
      ratings,
      statistics: {
        average_rating: avgResult?.average_rating ? Number.parseFloat(avgResult.average_rating) : 0,
        total_ratings: Number.parseInt(avgResult?.total_ratings || "0"),
        distribution: {
          5: Number.parseInt(avgResult?.five_star || "0"),
          4: Number.parseInt(avgResult?.four_star || "0"),
          3: Number.parseInt(avgResult?.three_star || "0"),
          2: Number.parseInt(avgResult?.two_star || "0"),
          1: Number.parseInt(avgResult?.one_star || "0"),
        },
      },
    })
  } catch (error) {
    console.error("Ratings fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch ratings" }, { status: 500 })
  }
}
