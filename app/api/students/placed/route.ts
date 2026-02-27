import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const placedStudents = await sql`
      SELECT 
        s.id,
        s.full_name,
        s.enrollment_number,
        c.name as course_name,
        s.current_semester,
        s.company_name,
        s.placement_tenure_days,
        s.placement_status,
        s.created_at as placement_date
      FROM students s
      JOIN courses c ON s.course_id = c.id
      WHERE s.placement_status = 'Placed'
      ORDER BY s.full_name ASC
    `

    return NextResponse.json({
      success: true,
      students: placedStudents,
      count: placedStudents.length,
    })
  } catch (error) {
    console.error("Failed to fetch placed students:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch placed students",
        students: [],
        count: 0,
      },
      { status: 500 },
    )
  }
}
