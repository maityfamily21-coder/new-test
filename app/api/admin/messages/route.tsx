import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { enqueueEmails } from "@/lib/email-queue"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))
    const rawLimit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const limit = [10, 20].includes(rawLimit) ? rawLimit : 10
    const offset = (page - 1) * limit

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages' AND (column_name = 'course_id' OR column_name = 'semester');
    `
    const hasCourseId = columns.some((col: any) => col.column_name === "course_id")
    const hasSemester = columns.some((col: any) => col.column_name === "semester")

    let courseFilterSQL = ""
    if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
      const courseIds = admin.assignedCourses.join(",")
      courseFilterSQL = ` AND (
        m.course_id IN (${courseIds}) OR
        m.id IN (SELECT message_id FROM message_course_semesters WHERE course_id IN (${courseIds})) OR
        m.id IN (SELECT mr.message_id FROM message_recipients mr JOIN students st ON mr.student_id = st.id WHERE st.course_id IN (${courseIds}))
      )`
    }
    // For Super Admin, leave courseFilterSQL empty - no additional filtering needed

    console.log("[MYT] Admin role:", admin.role)
    console.log("[MYT] Course filter:", courseFilterSQL || "NONE (Super Admin - show all)")

    let messages: any[] = []
    let total = 0

    if (hasCourseId && hasSemester) {
      if (admin.role === "super_admin") {
        const baseQuery = sql`
          WITH base AS (
            SELECT
              m.id,
              m.title,
              m.content,
              m.created_at,
              m.message_type,
              m.interest_id,
              i.name AS interest_name,
              m.course_id,
              c.name AS legacy_course_name,
              m.semester
            FROM messages m
            LEFT JOIN interests i ON m.interest_id = i.id
            LEFT JOIN courses c ON m.course_id = c.id
            WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
            ORDER BY m.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          ),
          mc AS (
            SELECT
              mcs.message_id,
              COUNT(*)::int AS mapping_count
            FROM message_course_semesters mcs
            GROUP BY mcs.message_id
          ),
          single_target AS (
            SELECT
              mcs.message_id,
              co.name AS course_name,
              mcs.semester
            FROM message_course_semesters mcs
            JOIN courses co ON co.id = mcs.course_id
            WHERE (mcs.message_id, mcs.course_id, mcs.semester) IN (
              SELECT message_id, course_id, semester
              FROM (
                SELECT message_id, course_id, semester,
                       ROW_NUMBER() OVER (PARTITION BY message_id ORDER BY course_id, semester) AS rn
                FROM message_course_semesters
              ) t
              WHERE t.rn = 1
            )
          )
          SELECT
            b.*,
            COALESCE(mc.mapping_count, 0) AS mapping_count,
            CASE
              WHEN b.message_type = 'students' THEN 'Personal'
              WHEN b.interest_id IS NOT NULL THEN 'Interest: ' || b.interest_name
              WHEN COALESCE(mc.mapping_count,0) > 1 THEN 'Multiple Courses (' || mc.mapping_count || ')'
              WHEN COALESCE(mc.mapping_count,0) = 1 THEN st.course_name || ' - Semester ' || st.semester
              WHEN b.course_id IS NOT NULL AND b.semester IS NOT NULL THEN b.legacy_course_name || ' - Semester ' || b.semester
              ELSE 'Unknown Target'
            END AS target_display
          FROM base b
          LEFT JOIN mc ON mc.message_id = b.id
          LEFT JOIN single_target st ON st.message_id = b.id
        `

        console.log("[MYT] Executing messages query...")
        messages = await baseQuery
        console.log("[MYT] Messages found:", messages.length)

        // Fetch total count
        const totalQuery = sql`
          SELECT COUNT(*)::int as count FROM messages m WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
        `
        const totalResult = await totalQuery
        total = totalResult[0].count
      } else {
        const baseQuery = sql`
          WITH cte AS (
            SELECT
              m.id,
              m.title,
              m.content,
              m.created_at,
              m.message_type,
              m.interest_id,
              i.name AS interest_name,
              m.course_id,
              c.name AS course_name,
              m.semester,
              CASE
                WHEN m.message_type = 'students' THEN 'Personal'
                WHEN m.interest_id IS NOT NULL THEN 'Interest: ' || i.name
                WHEN m.course_id IS NOT NULL AND m.semester IS NOT NULL THEN c.name || ' - Semester ' || m.semester
                ELSE 'Unknown Target'
              END AS target_display
            FROM messages m
            LEFT JOIN interests i ON m.interest_id = i.id
            LEFT JOIN courses c ON m.course_id = c.id
            WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
            ORDER BY m.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          )
          SELECT * FROM cte
        `
        console.log("[MYT] Executing messages query...")
        messages = await baseQuery
        console.log("[MYT] Messages found:", messages.length)

        // Fetch total count
        const totalQuery = sql`
          SELECT COUNT(*)::int as count FROM messages m WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
        `
        const totalResult = await totalQuery
        total = totalResult[0].count
      }
    } else {
      const baseQuery = sql`
        WITH cte AS (
          SELECT
            m.id,
            m.title,
            m.content,
            m.created_at,
            m.message_type,
            m.interest_id,
            i.name AS interest_name,
            CASE
              WHEN m.message_type = 'students' THEN 'Personal'
              WHEN m.interest_id IS NOT NULL THEN 'Interest: ' || i.name
              ELSE 'Unknown Target'
            END AS target_display
          FROM messages m
          LEFT JOIN interests i ON m.interest_id = i.id
          WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
          ORDER BY m.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT * FROM cte
      `
      console.log("[MYT] Executing messages query...")
      messages = await baseQuery
      console.log("[MYT] Messages found:", messages.length)

      // Fetch total count
      const totalQuery = sql`
        SELECT COUNT(*)::int as count FROM messages m WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
      `
      const totalResult = await totalQuery
      total = totalResult[0].count
    }

    return NextResponse.json({
      success: true,
      messages,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const { title, content, message_type, interest_ids, course_semesters, student_ids, image_url } =
      await request.json()

    if (admin.role === "course_admin") {
      if (message_type === "course_semester" && course_semesters && Array.isArray(course_semesters)) {
        for (const combo of course_semesters) {
          const courseId = Number.parseInt(combo.course_id)
          if (!admin.assignedCourses || !admin.assignedCourses.includes(courseId)) {
            return NextResponse.json(
              { success: false, message: "You don't have access to send messages to some selected courses" },
              { status: 403 },
            )
          }
        }
      }

      if (message_type === "students" && student_ids && Array.isArray(student_ids)) {
        const ids = student_ids.map((id) => Number.parseInt(String(id)))
        const studentCourses = await sql`
          SELECT DISTINCT course_id FROM students WHERE id = ANY(${ids})
        `
        for (const row of studentCourses) {
          if (!admin.assignedCourses || !admin.assignedCourses.includes(row.course_id)) {
            return NextResponse.json(
              { success: false, message: "You can only send messages to students from your assigned courses" },
              { status: 403 },
            )
          }
        }
      }
    }

    let messagesSent = 0
    let recipientsCount = 0
    const uniqueRecipientIds = new Set<number>()
    const allStudentEmails: string[] = []

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages' AND (column_name = 'course_id' OR column_name = 'semester');
    `
    const hasCourseId = columns.some((col: any) => col.column_name === "course_id")
    const hasSemester = columns.some((col: any) => col.column_name === "semester")

    if (message_type === "interest") {
      if (!interest_ids || interest_ids.length === 0) {
        return NextResponse.json({ success: false, message: "No interests selected" }, { status: 400 })
      }

      for (const interest_id of interest_ids) {
        await sql`
          INSERT INTO messages (title, content, message_type, interest_id, image_url)
          VALUES (${title}, ${content}, 'interest', ${Number.parseInt(interest_id)}, ${image_url || null})
        `
        messagesSent++

        let students
        if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
          students = await sql`
            SELECT s.id, s.email
            FROM students s
            JOIN student_interests si ON s.id = si.student_id
            WHERE si.interest_id = ${Number.parseInt(interest_id)}
            AND s.course_id = ANY(${admin.assignedCourses})
          `
        } else {
          students = await sql`
            SELECT s.id, s.email
            FROM students s
            JOIN student_interests si ON s.id = si.student_id
            WHERE si.interest_id = ${Number.parseInt(interest_id)}
          `
        }

        students.forEach((student: any) => {
          uniqueRecipientIds.add(student.id)
          if (student.email && !allStudentEmails.includes(student.email)) {
            allStudentEmails.push(student.email)
          }
        })
      }
    } else if (message_type === "course_semester") {
      const tableRes = await sql`SELECT to_regclass('public.message_course_semesters') AS reg`
      const mappingExists = Array.isArray(tableRes) && tableRes[0]?.reg

      if (!mappingExists) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Multi-course messages require the message_course_semesters mapping. Please run scripts/22-message-course-semesters.sql.",
          },
          { status: 400 },
        )
      }

      if (!course_semesters || course_semesters.length === 0) {
        return NextResponse.json(
          { success: false, message: "No course-semester combinations selected" },
          { status: 400 },
        )
      }

      const combos = Array.from(
        new Map(
          (course_semesters as any[])
            .map((cs) => ({
              course_id: Number.parseInt(String(cs.course_id), 10),
              semester: Number.parseInt(String(cs.semester), 10),
            }))
            .filter((cs) => Number.isFinite(cs.course_id) && Number.isFinite(cs.semester) && cs.semester > 0)
            .map((cs) => [`${cs.course_id}-${cs.semester}`, cs]),
        ).values(),
      )

      if (combos.length === 0) {
        return NextResponse.json({ success: false, message: "Invalid course-semester combinations" }, { status: 400 })
      }

      const [{ id: messageId }] = await sql`
        INSERT INTO messages (title, content, message_type, interest_id, course_id, semester, image_url)
        VALUES (${title}, ${content}, 'course_semester', NULL, NULL, NULL, ${image_url || null})
        RETURNING id
      `
      messagesSent = 1

      for (const cs of combos) {
        await sql`
          INSERT INTO message_course_semesters (message_id, course_id, semester)
          VALUES (${messageId}, ${cs.course_id}, ${cs.semester})
          ON CONFLICT DO NOTHING
        `
      }

      for (const cs of combos) {
        const students = await sql`
          SELECT id, email
          FROM students
          WHERE course_id = ${cs.course_id} AND current_semester = ${cs.semester}
        `
        students.forEach((student: any) => {
          uniqueRecipientIds.add(student.id)
          if (student.email && !allStudentEmails.includes(student.email)) {
            allStudentEmails.push(student.email)
          }
        })
      }
    } else if (message_type === "students") {
      if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return NextResponse.json({ success: false, message: "No students selected" }, { status: 400 })
      }

      const [{ id: messageId }] = await sql`
        INSERT INTO messages (title, content, message_type, image_url)
        VALUES (${title}, ${content}, 'students', ${image_url || null})
        RETURNING id
      `
      messagesSent++

      const ids = (student_ids as any[]).map((v) => Number.parseInt(String(v), 10)).filter((n) => Number.isFinite(n))

      if (ids.length > 0) {
        await sql`INSERT INTO message_recipients (message_id, student_id)
                  SELECT ${messageId}, UNNEST(${ids}::int[])
                  ON CONFLICT DO NOTHING`

        const students = await sql`
          SELECT id, email FROM students WHERE id = ANY(${ids})
        `
        students.forEach((s: any) => {
          uniqueRecipientIds.add(s.id)
          if (s.email && !allStudentEmails.includes(s.email)) {
            allStudentEmails.push(s.email)
          }
        })
      }
    } else {
      return NextResponse.json({ success: false, message: "Invalid message type" }, { status: 400 })
    }

    recipientsCount = uniqueRecipientIds.size

    if (allStudentEmails.length > 0) {
      try {
        const emailContent = `
          <strong>Message Type:</strong> ${
            message_type === "interest"
              ? "Interest-based"
              : message_type === "course_semester"
                ? "Course-based"
                : "Direct to selected students"
          }<br>
          <strong>Sent on:</strong> ${new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        `
        await enqueueEmails(
          allStudentEmails,
          "message",
          `📢 ${title}`,
          `
          <div><p>${content}</p>${emailContent}</div>
        `,
        )
        fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
      } catch (emailError) {
        console.error("Failed to enqueue email notifications:", emailError)
      }
    }

    return NextResponse.json({ success: true, messagesSent, recipientsCount })
  } catch (error) {
    console.error("Message sending error:", error)
    return NextResponse.json({ success: false, message: "Failed to send message(s)" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const { id, title, content, message_type, interest_ids, course_semesters, student_ids, image_url } =
      await request.json()

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages' AND (column_name = 'course_id' OR column_name = 'semester');
    `
    const hasCourseColumns = columns.some((col: any) => col.column_name === "course_id")
    const hasSemesterColumns = columns.some((col: any) => col.column_name === "semester")

    let updateQuery
    const allStudentEmails: string[] = []

    if (message_type === "interest") {
      if (!interest_ids || interest_ids.length === 0) {
        return NextResponse.json({ success: false, message: "No interests selected for update" }, { status: 400 })
      }
      updateQuery = sql`
        UPDATE messages
        SET title = ${title}, 
            content = ${content}, 
            message_type = 'interest', 
            interest_id = ${Number.parseInt(interest_ids[0])},
            course_id = NULL,
            semester = NULL,
            image_url = ${image_url || null}
        WHERE id = ${id}
      `

      let students
      if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
        students = await sql`
          SELECT s.email
          FROM students s
          JOIN student_interests si ON s.id = si.student_id
          WHERE si.interest_id = ${Number.parseInt(interest_ids[0])} AND s.email IS NOT NULL
          AND s.course_id = ANY(${admin.assignedCourses})
        `
      } else {
        students = await sql`
          SELECT s.email
          FROM students s
          JOIN student_interests si ON s.id = si.student_id
          WHERE si.interest_id = ${Number.parseInt(interest_ids[0])} AND s.email IS NOT NULL
        `
      }

      allStudentEmails.push(...students.map((s: any) => s.email))
    } else if (message_type === "course_semester") {
      const tableRes = await sql`SELECT to_regclass('public.message_course_semesters') AS reg`
      const mappingExists = Array.isArray(tableRes) && tableRes[0]?.reg

      if (!mappingExists) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Multi-course messages require the message_course_semesters mapping. Please run scripts/22-message-course-semesters.sql.",
          },
          { status: 400 },
        )
      }

      const combos = Array.from(
        new Map(
          (course_semesters as any[])
            .map((cs) => ({
              course_id: Number.parseInt(String(cs.course_id), 10),
              semester: Number.parseInt(String(cs.semester), 10),
            }))
            .filter((cs) => Number.isFinite(cs.course_id) && Number.isFinite(cs.semester) && cs.semester > 0)
            .map((cs) => [`${cs.course_id}-${cs.semester}`, cs]),
        ).values(),
      )

      if (combos.length === 0) {
        return NextResponse.json(
          { success: false, message: "Invalid course-semester combination for update" },
          { status: 400 },
        )
      }

      updateQuery = sql`
        UPDATE messages
        SET title = ${title},
            content = ${content},
            message_type = 'course_semester',
            interest_id = NULL,
            course_id = NULL,
            semester = NULL,
            image_url = ${image_url || null}
        WHERE id = ${id}
      `

      await sql`DELETE FROM message_course_semesters WHERE message_id = ${id}`
      for (const cs of combos) {
        await sql`
          INSERT INTO message_course_semesters (message_id, course_id, semester)
          VALUES (${id}, ${cs.course_id}, ${cs.semester})
          ON CONFLICT DO NOTHING
        `
      }

      const emails = await sql`
        SELECT DISTINCT s.email
        FROM students s
        WHERE EXISTS (
          SELECT 1
          FROM message_course_semesters mcs
          WHERE mcs.message_id = ${id}
            AND mcs.course_id = s.course_id
            AND mcs.semester = s.current_semester
        ) AND s.email IS NOT NULL
      `
      allStudentEmails.push(...emails.map((e: any) => e.email))
    } else if (message_type === "students") {
      if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return NextResponse.json({ success: false, message: "No students selected for update" }, { status: 400 })
      }
      updateQuery = sql`
        UPDATE messages
        SET title = ${title}, 
            content = ${content}, 
            message_type = 'students',
            image_url = ${image_url || null}
        WHERE id = ${id}
      `

      const ids = (student_ids as any[]).map((v) => Number.parseInt(String(v), 10)).filter((n) => Number.isFinite(n))

      if (ids.length > 0) {
        await sql`INSERT INTO message_recipients (message_id, student_id)
                  SELECT ${id}, UNNEST(${ids}::int[])
                  ON CONFLICT DO NOTHING`

        const students = await sql`
          SELECT email FROM students WHERE id = ANY(${ids})
        `
        allStudentEmails.push(...students.map((s: any) => s.email))
      }
    } else {
      return NextResponse.json({ success: false, message: "Invalid message type for update" }, { status: 400 })
    }

    await updateQuery

    if (allStudentEmails.length > 0) {
      try {
        const emailContent = `
          <strong>Message Type:</strong> ${
            message_type === "interest"
              ? "Interest-based"
              : message_type === "course_semester"
                ? "Course-based"
                : "Direct to selected students"
          }<br>
          <strong>Updated on:</strong> ${new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}<br><br>
          <em>This message has been updated. Please check the portal for the latest details.</em>
        `

        await enqueueEmails(
          allStudentEmails,
          "message",
          `📢 Updated: ${title}`,
          `
          <div><p>${content}</p>${emailContent}</div>
        `,
        )
        fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
      } catch (emailError) {
        console.error("Failed to enqueue email notifications:", emailError)
      }
    }

    return NextResponse.json({ success: true, message: "Message updated successfully" })
  } catch (error) {
    console.error("Message update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update message" }, { status: 500 })
  }
}
