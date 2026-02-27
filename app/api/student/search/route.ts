import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {

  try {

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")

    if (!q || q.trim() === "") {
      return NextResponse.json({
        success: true,
        students: []
      })
    }

    const students = await sql`
      SELECT 
        id,
        full_name as name,
        enrollment_number
      FROM students
      WHERE full_name ILIKE ${'%' + q + '%'}
      ORDER BY full_name
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      students
    })

  } catch (error) {

    console.error("Search error:", error)

    return NextResponse.json({
      success: false,
      students: []
    })

  }

}