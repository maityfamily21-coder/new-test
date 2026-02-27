import { neon } from "@neondatabase/serverless"
import { validateAdminAuth } from "@/lib/admin-auth"

const sqlClient = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  const authResult = await validateAdminAuth(request as any)
  if (!authResult.success || !authResult.admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = authResult.admin

  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const semester = searchParams.get("semester")

    console.log("[MYT] GET /api/admin/subjects - courseId:", courseId, "semester:", semester)

    const sql = sqlClient
    let subjects

    if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
      if (courseId && semester) {
        const cid = Number.parseInt(courseId)
        if (!admin.assignedCourses.includes(cid)) {
          return Response.json([]) // Return empty if not accessible
        }
        subjects = await sql`
          SELECT id, name, code, course_id, semester
          FROM subjects
          WHERE course_id = ${cid} AND semester = ${Number.parseInt(semester)}
          ORDER BY name ASC
        `
      } else if (courseId) {
        const cid = Number.parseInt(courseId)
        if (!admin.assignedCourses.includes(cid)) {
          return Response.json([]) // Return empty if not accessible
        }
        subjects = await sql`
          SELECT id, name, code, course_id, semester
          FROM subjects
          WHERE course_id = ${cid}
          ORDER BY semester ASC, name ASC
        `
      } else {
        subjects = await sql`
          SELECT s.id, s.name, s.code, s.course_id, s.semester, c.name as course_name
          FROM subjects s
          LEFT JOIN courses c ON s.course_id = c.id
          WHERE s.course_id = ANY(${admin.assignedCourses})
          ORDER BY c.name ASC, s.semester ASC, s.name ASC
        `
      }
    } else {
      // Super admin - see all
      if (courseId && semester) {
        subjects = await sql`
          SELECT id, name, code, course_id, semester
          FROM subjects
          WHERE course_id = ${Number.parseInt(courseId)} AND semester = ${Number.parseInt(semester)}
          ORDER BY name ASC
        `
      } else if (courseId) {
        subjects = await sql`
          SELECT id, name, code, course_id, semester
          FROM subjects
          WHERE course_id = ${Number.parseInt(courseId)}
          ORDER BY semester ASC, name ASC
        `
      } else {
        subjects = await sql`
          SELECT s.id, s.name, s.code, s.course_id, s.semester, c.name as course_name
          FROM subjects s
          LEFT JOIN courses c ON s.course_id = c.id
          ORDER BY c.name ASC, s.semester ASC, s.name ASC
        `
      }
    }

    console.log("[MYT] Subjects fetched:", subjects?.length || 0)
    return Response.json(subjects || [])
  } catch (error) {
    console.error("[MYT] Error in GET /api/admin/subjects:", error)
    return Response.json(
      {
        error: "Failed to fetch subjects",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const authResult = await validateAdminAuth(request as any)
  if (!authResult.success || !authResult.admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = authResult.admin

  try {
    const body = await request.json()
    const { course_id, name, code, semester } = body

    console.log("[MYT] POST /api/admin/subjects - body:", body)

    if (!course_id || !name || !code || !semester) {
      console.error("[MYT] Missing required fields:", { course_id, name, code, semester })
      return Response.json({ error: "Missing required fields: course_id, name, code, semester" }, { status: 400 })
    }

    const parsedCourseId = typeof course_id === "string" ? Number.parseInt(course_id) : course_id

    if (admin.role === "course_admin") {
      if (!admin.assignedCourses || !admin.assignedCourses.includes(parsedCourseId)) {
        return Response.json({ error: "You don't have access to add subjects to this course" }, { status: 403 })
      }
    }

    const sql = sqlClient
    const parsedSemester = typeof semester === "string" ? Number.parseInt(semester) : semester
    const normalizedCode = code.toUpperCase().trim()

    console.log("[MYT] Inserting subject with:", { parsedCourseId, name, code: normalizedCode, parsedSemester })

    if (Number.isNaN(parsedCourseId) || Number.isNaN(parsedSemester)) {
      console.error("[MYT] Invalid number conversion:", { parsedCourseId, parsedSemester })
      return Response.json({ error: "Invalid course_id or semester values" }, { status: 400 })
    }

    const existingSubject = await sql`
      SELECT id FROM subjects 
      WHERE course_id = ${parsedCourseId} 
      AND UPPER(TRIM(code)) = ${normalizedCode} 
      AND semester = ${parsedSemester}
    `

    if (existingSubject && existingSubject.length > 0) {
      console.warn("[MYT] Subject already exists:", { parsedCourseId, code: normalizedCode, parsedSemester })
      return Response.json(
        { error: "Subject with this code already exists in this course and semester" },
        { status: 409 },
      )
    }

    const result = await sql`
      INSERT INTO subjects (course_id, name, code, semester)
      VALUES (${parsedCourseId}, ${name.trim()}, ${normalizedCode}, ${parsedSemester})
      RETURNING id, name, code, course_id, semester
    `

    console.log("[MYT] Subject created successfully:", result?.[0])
    return Response.json({ success: true, message: "Subject added successfully", data: result?.[0] })
  } catch (error) {
    console.error("[MYT] Error in POST /api/admin/subjects:", error instanceof Error ? error.message : error)
    console.error("[MYT] Full error details:", error)
    return Response.json(
      {
        error: "Failed to add subject",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
