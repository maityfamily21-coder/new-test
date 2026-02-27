import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
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

    // Check if course_id, semester, and speaker_name columns exist in the seminars table
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seminars' AND (column_name = 'course_id' OR column_name = 'semester' OR column_name = 'speaker_name');
    `
    const hasCourseId = columns.some((col: any) => col.column_name === "course_id")
    const hasSemester = columns.some((col: any) => col.column_name === "semester")
    const hasSpeakerName = columns.some((col: any) => col.column_name === "speaker_name")

    let courseFilterSQL = ""
    if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
      const courseIds = admin.assignedCourses.join(",")
      courseFilterSQL = ` AND (
        s.course_id IN (${courseIds}) OR
        s.id IN (SELECT seminar_id FROM seminar_course_semesters WHERE course_id IN (${courseIds})) OR
        s.id IN (SELECT ss.seminar_id FROM seminar_students ss JOIN students st ON ss.student_id = st.id WHERE st.course_id IN (${courseIds})) OR
        s.id IN (SELECT sa.seminar_id FROM seminar_attendance sa JOIN students st ON sa.student_id = st.id WHERE st.course_id IN (${courseIds}))
      )`
    }
    // For Super Admin, leave courseFilterSQL empty - no additional filtering needed

    console.log("[MYT] Admin role:", admin.role)
    console.log("[MYT] Course filter:", courseFilterSQL || "NONE (Super Admin - show all)")

    const countQuery = await sql`SELECT COUNT(*)::int AS count FROM seminars s WHERE 1=1 ${sql.unsafe(courseFilterSQL)}`
    const [{ count: total }] = countQuery

    const upcomingQuery =
      await sql`SELECT COUNT(*)::int AS upcoming FROM seminars s WHERE 1=1 ${sql.unsafe(courseFilterSQL)} AND s.seminar_date > NOW()`
    const [{ upcoming }] = upcomingQuery

    const completedQuery =
      await sql`SELECT COUNT(*)::int AS completed FROM seminars s WHERE 1=1 ${sql.unsafe(courseFilterSQL)} AND s.seminar_date <= NOW()`
    const [{ completed }] = completedQuery

    let seminars: any[] = []

    if (hasCourseId && hasSemester) {
      const baseQuery = hasSpeakerName
        ? sql`
          WITH agg AS (
            SELECT seminar_id, COUNT(*)::int AS combo_count
            FROM seminar_course_semesters
            GROUP BY seminar_id
          ),
          single_map AS (
            SELECT scs.seminar_id, scs.course_id, scs.semester
            FROM seminar_course_semesters scs
            JOIN agg a ON a.seminar_id = scs.seminar_id AND a.combo_count = 1
          )
          SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.seminar_date, 
            s.created_at,
            s.interest_id,
            i.name AS interest_name,
            s.course_id,
            c.name AS course_name,
            s.semester,
            s.speaker_name,
            COALESCE(a.combo_count, 0) AS combo_count,
            CASE
              WHEN COALESCE(a.combo_count, 0) > 1 THEN 'Multiple courses (' || a.combo_count || ')'
              WHEN COALESCE(a.combo_count, 0) = 1 THEN sc.name || ' - Semester ' || sm.semester
              WHEN s.interest_id IS NOT NULL THEN 'Interest: ' || i.name
              WHEN s.course_id IS NOT NULL AND s.semester IS NOT NULL THEN c.name || ' - Semester ' || s.semester
              ELSE 'Selected Students'
            END AS target_display
          FROM seminars s
          LEFT JOIN interests i ON s.interest_id = i.id
          LEFT JOIN courses c ON s.course_id = c.id
          LEFT JOIN agg a ON a.seminar_id = s.id
          LEFT JOIN single_map sm ON sm.seminar_id = s.id
          LEFT JOIN courses sc ON sc.id = sm.course_id
          WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
          ORDER BY s.seminar_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        : sql`
          WITH agg AS (
            SELECT seminar_id, COUNT(*)::int AS combo_count
            FROM seminar_course_semesters
            GROUP BY seminar_id
          ),
          single_map AS (
            SELECT scs.seminar_id, scs.course_id, scs.semester
            FROM seminar_course_semesters scs
            JOIN agg a ON a.seminar_id = scs.seminar_id AND a.combo_count = 1
          )
          SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.seminar_date, 
            s.created_at,
            s.interest_id,
            i.name AS interest_name,
            s.course_id,
            c.name AS course_name,
            s.semester,
            NULL AS speaker_name,
            COALESCE(a.combo_count, 0) AS combo_count,
            CASE
              WHEN COALESCE(a.combo_count, 0) > 1 THEN 'Multiple courses (' || a.combo_count || ')'
              WHEN COALESCE(a.combo_count, 0) = 1 THEN sc.name || ' - Semester ' || sm.semester
              WHEN s.interest_id IS NOT NULL THEN 'Interest: ' || i.name
              WHEN s.course_id IS NOT NULL AND s.semester IS NOT NULL THEN c.name || ' - Semester ' || s.semester
              ELSE 'Selected Students'
            END AS target_display
          FROM seminars s
          LEFT JOIN interests i ON s.interest_id = i.id
          LEFT JOIN courses c ON s.course_id = c.id
          LEFT JOIN agg a ON a.seminar_id = s.id
          LEFT JOIN single_map sm ON sm.seminar_id = s.id
          LEFT JOIN courses sc ON sc.id = sm.course_id
          WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
          ORDER BY s.seminar_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `

      console.log("[MYT] Executing seminars query...")
      seminars = await baseQuery
      console.log("[MYT] Seminars found:", seminars.length)
    } else {
      const baseQuery = hasSpeakerName
        ? sql`
          WITH agg AS (
            SELECT seminar_id, COUNT(*)::int AS combo_count
            FROM seminar_course_semesters
            GROUP BY seminar_id
          ),
          single_map AS (
            SELECT scs.seminar_id, scs.course_id, scs.semester
            FROM seminar_course_semesters scs
            JOIN agg a ON a.seminar_id = scs.seminar_id AND a.combo_count = 1
          )
          SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.seminar_date, 
            s.created_at,
            s.interest_id,
            i.name AS interest_name,
            s.speaker_name,
            COALESCE(a.combo_count, 0) AS combo_count,
            CASE
              WHEN COALESCE(a.combo_count, 0) > 1 THEN 'Multiple courses (' || a.combo_count || ')'
              WHEN COALESCE(a.combo_count, 0) = 1 THEN sc.name || ' - Semester ' || sm.semester
              WHEN s.interest_id IS NOT NULL THEN 'Interest: ' || i.name
              ELSE 'Selected Students'
            END AS target_display
          FROM seminars s
          LEFT JOIN interests i ON s.interest_id = i.id
          LEFT JOIN agg a ON a.seminar_id = s.id
          LEFT JOIN single_map sm ON sm.seminar_id = s.id
          LEFT JOIN courses sc ON sc.id = sm.course_id
          WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
          ORDER BY s.seminar_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `
        : sql`
          WITH agg AS (
            SELECT seminar_id, COUNT(*)::int AS combo_count
            FROM seminar_course_semesters
            GROUP BY seminar_id
          ),
          single_map AS (
            SELECT scs.seminar_id, scs.course_id, scs.semester
            FROM seminar_course_semesters scs
            JOIN agg a ON a.seminar_id = scs.seminar_id AND a.combo_count = 1
          )
          SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.seminar_date, 
            s.created_at,
            s.interest_id,
            i.name AS interest_name,
            NULL AS speaker_name,
            COALESCE(a.combo_count, 0) AS combo_count,
            CASE
              WHEN COALESCE(a.combo_count, 0) > 1 THEN 'Multiple courses (' || a.combo_count || ')'
              WHEN COALESCE(a.combo_count, 0) = 1 THEN sc.name || ' - Semester ' || sm.semester
              WHEN s.interest_id IS NOT NULL THEN 'Interest: ' || i.name
              ELSE 'Selected Students'
            END AS target_display
          FROM seminars s
          LEFT JOIN interests i ON s.interest_id = i.id
          LEFT JOIN agg a ON a.seminar_id = s.id
          LEFT JOIN single_map sm ON sm.seminar_id = s.id
          LEFT JOIN courses sc ON sc.id = sm.course_id
          WHERE 1=1 ${sql.unsafe(courseFilterSQL)}
          ORDER BY s.seminar_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      seminars = await baseQuery
    }

    return NextResponse.json({
      success: true,
      seminars,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        upcoming,
        completed,
      },
    })
  } catch (error) {
    console.error("Seminars fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch seminars" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const {
      title,
      description,
      seminar_date,
      seminar_time,
      seminar_type,
      interest_ids,
      course_semesters,
      speaker_name,
      student_ids,
    } = await request.json()

    if (admin.role === "course_admin" && seminar_type === "course_semester") {
      if (course_semesters && Array.isArray(course_semesters)) {
        for (const combo of course_semesters) {
          const courseId = Number.parseInt(combo.course_id)
          if (!admin.assignedCourses || !admin.assignedCourses.includes(courseId)) {
            return NextResponse.json(
              { success: false, message: "You don't have access to create seminars for some selected courses" },
              { status: 403 },
            )
          }
        }
      }
    }

    const seminarDateTimeStr =
      seminar_time && seminar_time.length > 0 ? `${seminar_date} ${seminar_time}:00` : `${seminar_date} 00:00:00`
    const emailDate = new Date(`${seminar_date}T${seminar_time || "00:00"}:00+05:30`)
    if (Number.isNaN(emailDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date or time format. Please check your input." },
        { status: 400 },
      )
    }

    let seminarsCreated = 0
    let enrolledStudents = 0
    const allStudentEmails: string[] = []

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seminars' AND (column_name = 'course_id' OR column_name = 'semester' OR column_name = 'speaker_name');
    `
    const hasCourseId = columns.some((col: any) => col.column_name === "course_id")
    const hasSemester = columns.some((col: any) => col.column_name === "semester")
    const hasSpeakerName = columns.some((col: any) => col.column_name === "speaker_name")

    if (seminar_type === "interest") {
      if (!interest_ids || interest_ids.length === 0) {
        return NextResponse.json({ success: false, message: "No interests selected" }, { status: 400 })
      }
      for (const interest_id of interest_ids) {
        const [newSeminar] = hasSpeakerName
          ? await sql`
              INSERT INTO seminars (title, description, seminar_date, interest_id, speaker_name)
              VALUES (${title}, ${description}, ${seminarDateTimeStr}, ${Number.parseInt(interest_id)}, ${speaker_name || null})
              RETURNING id
            `
          : await sql`
              INSERT INTO seminars (title, description, seminar_date, interest_id)
              VALUES (${title}, ${description}, ${seminarDateTimeStr}, ${Number.parseInt(interest_id)})
              RETURNING id
            `
        seminarsCreated++

        let studentsToEnroll
        if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
          studentsToEnroll = await sql`
            SELECT s.id, s.email
            FROM students s
            JOIN student_interests si ON s.id = si.student_id
            WHERE si.interest_id = ${Number.parseInt(interest_id)}
            AND s.course_id = ANY(${admin.assignedCourses})
          `
        } else {
          studentsToEnroll = await sql`
            SELECT s.id, s.email
            FROM students s
            JOIN student_interests si ON s.id = si.student_id
            WHERE si.interest_id = ${Number.parseInt(interest_id)}
          `
        }

        for (const student of studentsToEnroll as any[]) {
          await sql`
            INSERT INTO seminar_attendance (seminar_id, student_id, status)
            VALUES (${newSeminar.id}, ${student.id}, 'Absent')
            ON CONFLICT (seminar_id, student_id) DO NOTHING
          `
          enrolledStudents++
          if (student.email && !allStudentEmails.includes(student.email)) {
            allStudentEmails.push(student.email)
          }
        }
      }
    } else if (seminar_type === "course_semester") {
      if (!hasCourseId || !hasSemester) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Course-semester seminars require database migration. Please run the migration script to enable this feature.",
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

      // Create ONE seminar; keep course_id/semester NULL and track combinations in seminar_course_semesters
      const [newSeminar] = hasSpeakerName
        ? await sql`
            INSERT INTO seminars (title, description, seminar_date, interest_id, course_id, semester, speaker_name)
            VALUES (${title}, ${description}, ${seminarDateTimeStr}, NULL, NULL, NULL, ${speaker_name || null})
            RETURNING id
          `
        : await sql`
            INSERT INTO seminars (title, description, seminar_date, interest_id, course_id, semester)
            VALUES (${title}, ${description}, ${seminarDateTimeStr}, NULL, NULL, NULL)
            RETURNING id
          `
      seminarsCreated++

      // Insert mapping rows and gather students per combo (dedupe by student id)
      const uniqueStudents = new Map<number, { id: number; email: string | null }>()
      for (const combo of course_semesters) {
        const cid = Number.parseInt(combo.course_id)
        const sem = Number.parseInt(combo.semester)
        if (!Number.isFinite(cid) || !Number.isFinite(sem)) continue

        await sql`
          INSERT INTO seminar_course_semesters (seminar_id, course_id, semester)
          VALUES (${newSeminar.id}, ${cid}, ${sem})
          ON CONFLICT (seminar_id, course_id, semester) DO NOTHING
        `

        const rows: Array<{ id: number; email: string | null }> = await sql`
          SELECT id, email FROM students
          WHERE course_id = ${cid} AND current_semester = ${sem}
        `
        for (const r of rows) uniqueStudents.set(r.id, r)
      }

      for (const student of uniqueStudents.values()) {
        await sql`
          INSERT INTO seminar_attendance (seminar_id, student_id, status)
          VALUES (${newSeminar.id}, ${student.id}, 'Absent')
          ON CONFLICT (seminar_id, student_id) DO NOTHING
        `
        enrolledStudents++
        if (student.email && !allStudentEmails.includes(student.email)) {
          allStudentEmails.push(student.email)
        }
      }
    } else if (seminar_type === "students") {
      const ids: number[] = Array.isArray(student_ids)
        ? student_ids.map((x: any) => Number.parseInt(String(x), 10)).filter((n: number) => Number.isFinite(n))
        : []
      if (ids.length === 0) {
        return NextResponse.json({ success: false, message: "No students selected" }, { status: 400 })
      }

      if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
        const studentCourses = await sql`
          SELECT DISTINCT course_id FROM students WHERE id = ANY(${ids})
        `
        for (const row of studentCourses) {
          if (!admin.assignedCourses.includes(row.course_id)) {
            return NextResponse.json(
              { success: false, message: "You can only select students from your assigned courses" },
              { status: 403 },
            )
          }
        }
      }

      const [newSeminar] = hasSpeakerName
        ? await sql`
            INSERT INTO seminars (title, description, seminar_date, interest_id, course_id, semester, speaker_name)
            VALUES (${title}, ${description}, ${seminarDateTimeStr}, NULL, NULL, NULL, ${speaker_name || null})
            RETURNING id
          `
        : await sql`
            INSERT INTO seminars (title, description, seminar_date, interest_id, course_id, semester)
            VALUES (${title}, ${description}, ${seminarDateTimeStr}, NULL, NULL, NULL)
            RETURNING id
          `
      seminarsCreated++
      const emails: { email: string | null }[] = await sql`
        SELECT email FROM students WHERE id = ANY(${ids})
      `
      for (const sid of ids) {
        await sql`
          INSERT INTO seminar_attendance (seminar_id, student_id, status)
          VALUES (${newSeminar.id}, ${sid}, 'Absent')
          ON CONFLICT (seminar_id, student_id) DO NOTHING
        `
        await sql`
          INSERT INTO seminar_students (seminar_id, student_id)
          VALUES (${newSeminar.id}, ${sid})
          ON CONFLICT (seminar_id, student_id) DO NOTHING
        `
        enrolledStudents++
      }
      for (const row of emails) {
        if (row.email && !allStudentEmails.includes(row.email)) allStudentEmails.push(row.email)
      }
    } else {
      return NextResponse.json({ success: false, message: "Invalid seminar type" }, { status: 400 })
    }

    if (allStudentEmails.length > 0) {
      try {
        const emailContent = `
          <strong>Seminar Date:</strong> ${emailDate.toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Kolkata",
          })}<br>
          <strong>Time:</strong> ${
            seminar_time
              ? new Date(`${seminar_date}T${seminar_time}:00+05:30`).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata",
                })
              : "To be announced"
          }<br>
          <strong>Type:</strong> ${
            seminar_type === "interest"
              ? "Interest-based"
              : seminar_type === "course_semester"
                ? "Course-based"
                : "Selected Students"
          }<br>
          ${speaker_name ? `<strong>Speaker:</strong> ${speaker_name}<br>` : ""}
        `
        // enqueue and fire-and-forget processor; do not await
        await enqueueEmails(
          allStudentEmails,
          "seminar",
          `⏰ New Seminar: ${title}`,
          `
          <div style="margin-bottom: 20px;">
            <h3 style="margin:0 0 10px 0;">${title}</h3>
            <p style="margin:0 0 10px 0;">${description}</p>
            ${emailContent}
          </div>
        `,
        )
        fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
      } catch (emailError) {
        console.error("Failed to enqueue email notifications:", emailError)
      }
    }
    return NextResponse.json({ success: true, seminarsCreated, enrolledStudents })
  } catch (error) {
    console.error("Seminar creation error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to create seminar(s): ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success || !authResult.admin) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const {
      id,
      title,
      description,
      seminar_date,
      seminar_time,
      seminar_type,
      interest_ids,
      course_semesters,
      speaker_name,
      student_ids,
    } = await request.json()

    const seminarDateTimeStr =
      seminar_time && seminar_time.length > 0 ? `${seminar_date} ${seminar_time}:00` : `${seminar_date} 00:00:00`
    const emailDate = new Date(`${seminar_date}T${seminar_time || "00:00"}:00+05:30`)
    if (Number.isNaN(emailDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date or time format. Please check your input." },
        { status: 400 },
      )
    }

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seminars' AND (column_name = 'course_id' OR column_name = 'semester' OR column_name = 'speaker_name');
    `
    const hasCourseId = columns.some((col: any) => col.column_name === "course_id")
    const hasSemester = columns.some((col: any) => col.column_name === "semester")
    const hasSpeakerName = columns.some((col: any) => col.column_name === "speaker_name")

    let updateQuery
    let enrolledStudents = 0
    const allStudentEmails: string[] = []

    if (seminar_type === "interest") {
      if (!interest_ids || interest_ids.length === 0) {
        return NextResponse.json({ success: false, message: "No interests selected for update" }, { status: 400 })
      }
      updateQuery = hasSpeakerName
        ? sql`
            UPDATE seminars
            SET title = ${title},
                description = ${description},
                seminar_date = ${seminarDateTimeStr},
                interest_id = ${Number.parseInt(interest_ids[0])},
                course_id = NULL,
                semester = NULL,
                speaker_name = ${speaker_name || null}
            WHERE id = ${id}
          `
        : sql`
            UPDATE seminars
            SET title = ${title},
                description = ${description},
                seminar_date = ${seminarDateTimeStr},
                interest_id = ${Number.parseInt(interest_ids[0])},
                course_id = NULL,
                semester = NULL
            WHERE id = ${id}
          `
      const students = await sql`
        SELECT s.email
        FROM students s
        JOIN student_interests si ON s.id = si.student_id
        WHERE si.interest_id = ${Number.parseInt(interest_ids[0])} AND s.email IS NOT NULL
      `
      allStudentEmails.push(...(students as any[]).map((s: any) => s.email))
    } else if (seminar_type === "course_semester") {
      // Validate course admin can only update seminars for their courses
      if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
        if (course_semesters && Array.isArray(course_semesters)) {
          for (const combo of course_semesters) {
            const courseId = Number.parseInt(combo.course_id)
            if (!admin.assignedCourses || !admin.assignedCourses.includes(courseId)) {
              return NextResponse.json(
                { success: false, message: "You don't have access to update seminars for some selected courses" },
                { status: 403 },
              )
            }
          }
        }
      }

      if (!hasCourseId || !hasSemester) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Course-semester seminars require database migration. Please run the migration script to enable this feature.",
          },
          { status: 400 },
        )
      }
      if (!course_semesters || course_semesters.length === 0) {
        return NextResponse.json(
          { success: false, message: "No course-semester combinations selected for update" },
          { status: 400 },
        )
      }

      // Keep course_id/semester NULL on the seminar row; target is defined by mapping table
      updateQuery = hasSpeakerName
        ? sql`
            UPDATE seminars
            SET title = ${title},
                description = ${description},
                seminar_date = ${seminarDateTimeStr},
                interest_id = NULL,
                course_id = NULL,
                semester = NULL,
                speaker_name = ${speaker_name || null}
            WHERE id = ${id}
          `
        : sql`
            UPDATE seminars
            SET title = ${title},
                description = ${description},
                seminar_date = ${seminarDateTimeStr},
                interest_id = NULL,
                course_id = NULL,
                semester = NULL
            WHERE id = ${id}
          `

      await updateQuery

      // Replace mapping rows
      await sql`DELETE FROM seminar_course_semesters WHERE seminar_id = ${id}`
      const uniqueStudents = new Map<number, { id: number; email: string | null }>()
      for (const combo of course_semesters) {
        const cid = Number.parseInt(combo.course_id)
        const sem = Number.parseInt(combo.semester)
        if (!Number.isFinite(cid) || !Number.isFinite(sem)) continue

        await sql`
          INSERT INTO seminar_course_semesters (seminar_id, course_id, semester)
          VALUES (${id}, ${cid}, ${sem})
          ON CONFLICT (seminar_id, course_id, semester) DO NOTHING
        `

        const rows: Array<{ id: number; email: string | null }> = await sql`
          SELECT id, email FROM students
          WHERE course_id = ${cid} AND current_semester = ${sem}
        `
        for (const r of rows) uniqueStudents.set(r.id, r)
      }

      // Re-enroll attendance from scratch to reflect new target (similar to students update branch)
      await sql`DELETE FROM seminar_attendance WHERE seminar_id = ${id}`
      for (const student of uniqueStudents.values()) {
        await sql`
          INSERT INTO seminar_attendance (seminar_id, student_id, status)
          VALUES (${id}, ${student.id}, 'Absent')
          ON CONFLICT (seminar_id, student_id) DO NOTHING
        `
        enrolledStudents++
        if (student.email && !allStudentEmails.includes(student.email)) allStudentEmails.push(student.email)
      }

      // Collect notification audience for email
      const emailsFromCombos: { email: string | null }[] = await sql`
        SELECT DISTINCT s.email
        FROM students s
        JOIN seminar_course_semesters scs
          ON scs.course_id = s.course_id AND scs.semester = s.current_semester
        WHERE scs.seminar_id = ${id} AND s.email IS NOT NULL
      `
      for (const row of emailsFromCombos) {
        if (row.email && !allStudentEmails.includes(row.email)) allStudentEmails.push(row.email)
      }
    } else if (seminar_type === "students") {
      const ids: number[] = Array.isArray(student_ids)
        ? student_ids.map((x: any) => Number.parseInt(String(x), 10)).filter((n: number) => Number.isFinite(n))
        : []
      if (ids.length === 0) {
        return NextResponse.json({ success: false, message: "No students selected for update" }, { status: 400 })
      }
      updateQuery = hasSpeakerName
        ? sql`
            UPDATE seminars
            SET title = ${title},
                description = ${description},
                seminar_date = ${seminarDateTimeStr},
                interest_id = NULL,
                course_id = NULL,
                semester = NULL,
                speaker_name = ${speaker_name || null}
            WHERE id = ${id}
          `
        : sql`
            UPDATE seminars
            SET title = ${title},
                description = ${description},
                seminar_date = ${seminarDateTimeStr},
                interest_id = NULL,
                course_id = NULL,
                semester = NULL
            WHERE id = ${id}
          `

      await updateQuery

      await sql`DELETE FROM seminar_attendance WHERE seminar_id = ${id}`
      for (const sid of ids) {
        await sql`
          INSERT INTO seminar_attendance (seminar_id, student_id, status)
          VALUES (${id}, ${sid}, 'Absent')
          ON CONFLICT (seminar_id, student_id) DO NOTHING
        `
        enrolledStudents++
      }
      const emails: { email: string | null }[] = await sql`
        SELECT email FROM students WHERE id = ANY(${ids})
      `
      for (const row of emails) {
        if (row.email && !allStudentEmails.includes(row.email)) allStudentEmails.push(row.email)
      }
    } else {
      return NextResponse.json({ success: false, message: "Invalid seminar type for update" }, { status: 400 })
    }

    if (allStudentEmails.length > 0) {
      try {
        const emailContent = `
          <strong>Updated Seminar Date:</strong> ${emailDate.toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Kolkata",
          })}<br>
          <strong>Time:</strong> ${
            seminar_time
              ? new Date(`${seminar_date}T${seminar_time}:00+05:30`).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata",
                })
              : "To be announced"
          }<br>
          <strong>Type:</strong> ${
            seminar_type === "interest"
              ? "Interest-based"
              : seminar_type === "course_semester"
                ? "Course-based"
                : "Selected Students"
          }<br>
          ${speaker_name ? `<strong>Speaker:</strong> ${speaker_name}<br>` : ""}<br>
          <em>This seminar has been updated. Please check the portal for the latest details.</em>
        `
        // enqueue and fire-and-forget processor; do not await
        await enqueueEmails(
          allStudentEmails,
          "seminar",
          `Updated: ${title}`,
          `
          <div style="margin-bottom: 20px;">
            <h3 style="margin:0 0 10px 0;">${title}</h3>
            <p style="margin:0 0 10px 0;">${description}</p>
            ${emailContent}
          </div>
        `,
        )
        fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
      } catch (emailError) {
        console.error("Failed to enqueue email notifications:", emailError)
      }
    }
    return NextResponse.json({ success: true, message: "Seminar updated successfully" })
  } catch (error) {
    console.error("Seminar update error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to update seminar: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
