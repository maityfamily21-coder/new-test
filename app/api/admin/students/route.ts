import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"
import { generateQRTokensForStudent } from "@/lib/exam-qr-utils"
import { generateUniqueStudentCode } from "@/lib/student-code-generator"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  console.log("[MYT] Admin students GET request received")

  const authResult = await validateAdminAuth(request)
  console.log("[MYT] Auth result:", authResult)

  if (!authResult.success || !authResult.admin) {
    console.log("[MYT] Auth failed, returning unauthorized")
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const courseId = searchParams.get("course_id") || ""
    const semester = searchParams.get("semester") || ""
    const placementOnly = searchParams.get("placement_only") === "true"
    const unassignedOnly = searchParams.get("unassignedOnly") === "true"
    const examCourseId = searchParams.get("courseId")
    const examSemester = searchParams.get("semester")

    const filtersParam = (searchParams.get("filters") || "").trim()
    const parsedPairs: Array<{ courseId: number; semester: number }> = []
    if (filtersParam) {
      for (const token of filtersParam.split(",")) {
        const [cidStr, semStr] = token.split("-")
        const cid = Number.parseInt(cidStr)
        const sem = Number.parseInt(semStr)
        if (Number.isFinite(cid) && Number.isFinite(sem) && cid > 0 && sem > 0) {
          parsedPairs.push({ courseId: cid, semester: sem })
        }
      }
    }

    const offset = (page - 1) * limit

    console.log("[MYT] Pagination params:", {
      page,
      limit,
      offset,
      search,
      courseId,
      semester,
      placementOnly,
      unassignedOnly,
      filtersParam,
      parsedPairs,
    })

    let whereClause = ""
    const conditions: string[] = []

    if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
      conditions.push(`s.course_id IN (${admin.assignedCourses.join(",")})`)
    }

    if (search) {
      conditions.push(`(s.full_name ILIKE '%${search}%' OR s.enrollment_number ILIKE '%${search}%')`)
    }

    if (placementOnly) {
      conditions.push(`s.placement_status = 'Placed'`)
    }

    if (unassignedOnly) {
      conditions.push(`NOT EXISTS (SELECT 1 FROM batch_students bs WHERE bs.student_id = s.id)`)
    }

    if (examCourseId && examSemester) {
      conditions.push(
        `s.course_id = ${Number.parseInt(examCourseId)} AND s.current_semester = ${Number.parseInt(examSemester)}`,
      )
    } else if (parsedPairs.length > 0) {
      const orGroups = parsedPairs.map((p) => `(s.course_id = ${p.courseId} AND s.current_semester = ${p.semester})`)
      conditions.push(`(${orGroups.join(" OR ")})`)
    } else {
      if (courseId && courseId !== "all") {
        conditions.push(`s.course_id = ${Number.parseInt(courseId)}`)
      }
      if (semester && semester !== "all" && courseId && courseId !== "all") {
        conditions.push(`s.current_semester = ${Number.parseInt(semester)}`)
      }
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(" AND ")}`
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      ${whereClause}
    `

    console.log("[MYT] Count query:", countQuery)
    const totalResult =
      await sql`SELECT COUNT(*) as total FROM students s LEFT JOIN courses c ON s.course_id = c.id ${whereClause ? sql.unsafe(whereClause) : sql``}`
    const total = Number.parseInt(totalResult[0].total)

    // Get students with pagination
    const studentsQuery = `
      SELECT 
        s.*,
        c.name as course_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', i.id, 'name', i.name)
          ) FILTER (WHERE i.id IS NOT NULL), 
          '[]'
        ) as interests
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN student_interests si ON s.id = si.student_id
      LEFT JOIN interests i ON si.interest_id = i.id
      ${whereClause}
      GROUP BY s.id, c.name
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    console.log("[MYT] Students query:", studentsQuery)
    const students = await sql`
      SELECT 
        s.*,
        c.name as course_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', i.id, 'name', i.name)
          ) FILTER (WHERE i.id IS NOT NULL), 
          '[]'
        ) as interests
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN student_interests si ON s.id = si.student_id
      LEFT JOIN interests i ON si.interest_id = i.id
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      GROUP BY s.id, c.name
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    console.log("[MYT] Students fetched:", students.length, "students found, total:", total)

    return NextResponse.json({
      success: true,
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("[MYT] Students fetch error:", error)
    return NextResponse.json({ success: false, message: `Failed to fetch students: ${error.message}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const data = await request.json()
    const {
      full_name,
      enrollment_number,
      course_id,
      email,
      phone_number,
      parent_phone_number,
      admission_semester,
      current_semester,
      resume_link,
      agreement_link,
      placement_status,
      company_name,
      placement_tenure_days,
      password,
      interests,
    } = data

    if (admin.role === "course_admin") {
      if (!admin.assignedCourses || !admin.assignedCourses.includes(Number(course_id))) {
        return NextResponse.json(
          { success: false, message: "You don't have access to add students to this course" },
          { status: 403 },
        )
      }
    }

    // Generate unique student code
    const unique_code = await generateUniqueStudentCode()

    // Insert student with unique_code
    const studentResult = await sql`
      INSERT INTO students (
        full_name, enrollment_number, course_id, email, phone_number,
        parent_phone_number, admission_semester, current_semester,
        resume_link, agreement_link, placement_status, company_name,
        placement_tenure_days, password, unique_code
      ) VALUES (
        ${full_name}, ${enrollment_number}, ${course_id}, ${email}, ${phone_number},
        ${parent_phone_number}, ${admission_semester}, ${current_semester},
        ${resume_link}, ${agreement_link}, ${placement_status}, ${company_name},
        ${placement_tenure_days}, ${password}, ${unique_code}
      ) RETURNING id
    `

    const studentId = studentResult[0].id

    // Insert student interests
    if (interests && interests.length > 0) {
      for (const interestId of interests) {
        await sql`
          INSERT INTO student_interests (student_id, interest_id)
          VALUES (${studentId}, ${interestId})
        `
      }
    }

    await generateQRTokensForStudent(studentId, Number(course_id), Number(current_semester))

    return NextResponse.json({ success: true, message: "Student added successfully" })
  } catch (error) {
    console.error("Student creation error:", error)
    return NextResponse.json({ success: false, message: "Failed to add student" }, { status: 500 })
  }
}
