import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const courses = await sql`
      SELECT id, name, code, total_semesters, description
      FROM courses
      ORDER BY name
    `

    return Response.json(courses)
  } catch (error) {
    console.error("[MYT] Error fetching courses:", error)
    return Response.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
