import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { enqueueEmails } from "@/lib/email-queue"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))
    const rawLimit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const limit = [10, 20].includes(rawLimit) ? rawLimit : 10
    const offset = (page - 1) * limit

    const [{ count: total }] = await sql`SELECT COUNT(*)::int AS count FROM companies`

    // Page companies first, then aggregate applications for those IDs
    const companies = await sql`
      WITH cte AS (
        SELECT 
          c.*,
          i.name AS interest_name,
          co_target.name AS course_name
        FROM companies c
        LEFT JOIN interests i ON c.interest_id = i.id
        LEFT JOIN courses co_target ON c.course_id = co_target.id
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      )
      SELECT
        cte.*,
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'course_id', ccs.course_id,
              'semester', ccs.semester,
              'course_name', co2.name
            )
            ORDER BY co2.name, ccs.semester
          )
          FROM company_course_semesters ccs
          LEFT JOIN courses co2 ON ccs.course_id = co2.id
          WHERE ccs.company_id = cte.id
        ), '[]') AS course_targets,
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'student_id', s.id,
              'student_name', s.full_name,
              'enrollment_number', s.enrollment_number,
              'course_name', co.name,
              'from_semester', s.current_semester
            )
            ORDER BY s.full_name ASC
          )
          FROM company_recipients cr
          JOIN students s ON cr.student_id = s.id
          LEFT JOIN courses co ON s.course_id = co.id
          WHERE cr.company_id = cte.id
        ), '[]') AS students,
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'student_id', s.id,
              'student_name', s.full_name,
              'enrollment_number', s.enrollment_number,
              'course_name', co.name,
              'from_semester', s.current_semester,
              'applied_at', ca.applied_at,
              'student_course_id', s.course_id
            )
            ORDER BY ca.applied_at DESC
          )
          FROM company_applications ca
          LEFT JOIN students s ON ca.student_id = s.id
          LEFT JOIN courses co ON s.course_id = co.id
          WHERE ca.company_id = cte.id
        ), '[]') AS applications
      FROM cte
    `

    return NextResponse.json({
      success: true,
      companies,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    console.error("Companies fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch companies" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  try {
    const {
      name,
      position,
      description,
      application_deadline,
      targeting_mode,
      interest_ids,
      course_semesters,
      opening_type,
      tenure_days,
      student_ids,
      custom_link,
      image_url,
    } = await request.json()

    if (opening_type !== "job" && opening_type !== "internship") {
      return NextResponse.json({ success: false, message: "Invalid opening_type" }, { status: 400 })
    }
    const tenureValue = opening_type === "internship" ? Number(tenure_days) : null
    if (opening_type === "internship" && (!tenureValue || tenureValue <= 0)) {
      return NextResponse.json({ success: false, message: "tenure_days must be > 0 for internships" }, { status: 400 })
    }

    let openingsCreated = 0
    let totalStudentsNotified = 0

    if (targeting_mode === "interest") {
      if (!interest_ids || !Array.isArray(interest_ids) || interest_ids.length === 0) {
        return NextResponse.json(
          { success: false, message: "interest_ids array is required for interest targeting" },
          { status: 400 },
        )
      }

      // Create separate opening for each interest
      for (const interest_id of interest_ids) {
        await sql`
          INSERT INTO companies (name, position, description, interest_id, application_deadline, targeting_mode, course_id, semester, opening_type, tenure_days, custom_link, image_url)
          VALUES (${name}, ${position}, ${description}, ${interest_id}, ${application_deadline}, 'interest', NULL, NULL, ${opening_type}, ${tenureValue}, ${custom_link || null}, ${image_url || null})
        `
        openingsCreated++

        // Send notifications for this interest
        try {
          const students = await sql`
            SELECT s.email
            FROM students s
            JOIN student_interests si ON s.id = si.student_id
            WHERE si.interest_id = ${interest_id} AND s.email IS NOT NULL
          `
          const studentEmails = students.map((s: any) => s.email)
          if (studentEmails.length > 0) {
            const emailContent = `
              <strong>Company:</strong> ${name}<br>
              <strong>Position:</strong> ${position}<br>
              <strong>Opening Type:</strong> ${opening_type === "internship" ? "Internship" : "Job"}${
                tenureValue ? ` (${tenureValue} days)` : ""
              }<br>
              <strong>Application Deadline:</strong> ${new Date(application_deadline).toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}<br>
              <strong>Targeting:</strong> By Interests
            `
            await enqueueEmails(
              studentEmails,
              "company",
              `🏢 ${name} - ${position}`,
              `
              <div><p>${description}</p>${emailContent}</div>
            `,
            )
            fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
            totalStudentsNotified += studentEmails.length
          }
        } catch (emailError) {
          console.error("Failed to send email notifications for interest:", interest_id, emailError)
        }
      }
    } else if (targeting_mode === "course_semester") {
      if (!course_semesters || !Array.isArray(course_semesters) || course_semesters.length === 0) {
        return NextResponse.json(
          { success: false, message: "course_semesters array is required for course_semester targeting" },
          { status: 400 },
        )
      }
      for (const combination of course_semesters) {
        if (!combination.course_id || !combination.semester) {
          return NextResponse.json(
            { success: false, message: "Each course_semester combination must have course_id and semester" },
            { status: 400 },
          )
        }
      }

      // Create ONE opening, then map multiple course-semesters
      const inserted = await sql`
        INSERT INTO companies (name, position, description, interest_id, application_deadline, targeting_mode, course_id, semester, opening_type, tenure_days, custom_link, image_url)
        VALUES (${name}, ${position}, ${description}, NULL, ${application_deadline}, 'course_semester', NULL, NULL, ${opening_type}, ${tenureValue}, ${custom_link || null}, ${image_url || null})
        RETURNING id
      `
      const companyId = inserted[0]?.id as number
      openingsCreated = 1

      // Insert mappings
      for (const combination of course_semesters) {
        await sql`
          INSERT INTO company_course_semesters (company_id, course_id, semester)
          VALUES (${companyId}, ${combination.course_id}, ${combination.semester})
          ON CONFLICT DO NOTHING
        `
      }

      // Notify students (dedupe emails across all combinations)
      try {
        const emailsSet = new Set<string>()
        for (const combination of course_semesters) {
          const students = await sql`
            SELECT s.email
            FROM students s
            WHERE s.course_id = ${combination.course_id}
              AND s.current_semester = ${combination.semester}
              AND s.email IS NOT NULL
          `
          for (const row of students as any[]) {
            if (row.email) emailsSet.add(row.email)
          }
        }

        const emailList = Array.from(emailsSet)
        if (emailList.length > 0) {
          const comboDescriptions: string[] = []
          for (const combination of course_semesters) {
            const courseNameRes = await sql`SELECT name FROM courses WHERE id = ${combination.course_id}`
            const courseName = courseNameRes[0]?.name || "Selected Course"
            comboDescriptions.push(`${courseName} • Semester ${combination.semester}`)
          }

          const emailContent = `
            <strong>Company:</strong> ${name}<br>
            <strong>Position:</strong> ${position}<br>
            <strong>Opening Type:</strong> ${opening_type === "internship" ? "Internship" : "Job"}${
              tenureValue ? ` (${tenureValue} days)` : ""
            }<br>
            <strong>Application Deadline:</strong> ${new Date(application_deadline).toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}<br>
            <strong>Targeting:</strong> ${comboDescriptions.join(", ")}
          `
          await enqueueEmails(
            emailList,
            "company",
            `🏢 ${name} - ${position}`,
            `<div><p>${description}</p>${emailContent}</div>`,
          )
          fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
          totalStudentsNotified += emailList.length
        }
      } catch (emailError) {
        console.error("Failed to send email notifications for course-semester targets:", emailError)
      }
    } else if (targeting_mode === "students") {
      if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return NextResponse.json(
          { success: false, message: "student_ids array is required for students targeting" },
          { status: 400 },
        )
      }

      // Create one opening row with students mode (no interest/course/semester)
      const inserted = await sql`
        INSERT INTO companies (name, position, description, interest_id, application_deadline, targeting_mode, course_id, semester, opening_type, tenure_days, custom_link, image_url)
        VALUES (${name}, ${position}, ${description}, NULL, ${application_deadline}, 'students', NULL, NULL, ${opening_type}, ${tenureValue}, ${custom_link || null}, ${image_url || null})
        RETURNING id
      `
      const companyId = inserted[0]?.id as number
      openingsCreated++

      // Map recipients
      if (companyId) {
        // Insert recipients
        await sql`
          INSERT INTO company_recipients (company_id, student_id)
          SELECT ${companyId} AS company_id, s.id
          FROM students s
          WHERE s.id = ANY(${student_ids})
          ON CONFLICT DO NOTHING
        `

        // Notify those students
        try {
          const rows = await sql`SELECT email FROM students WHERE id = ANY(${student_ids}) AND email IS NOT NULL`
          const emails = rows.map((r: any) => r.email).filter(Boolean)
          if (emails.length > 0) {
            const emailContent = `
              <strong>Company:</strong> ${name}<br>
              <strong>Position:</strong> ${position}<br>
              <strong>Opening Type:</strong> ${opening_type === "internship" ? "Internship" : "Job"}${
                tenureValue ? ` (${tenureValue} days)` : ""
              }<br>
            <strong>Application Deadline:</strong> ${new Date(application_deadline).toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}<br>
            <strong>Targeting:</strong> Selected Students
            `
            await enqueueEmails(
              emails,
              "company",
              `🏢 ${name} - ${position}`,
              `<div><p>${description}</p>${emailContent}</div>`,
            )
            fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
            totalStudentsNotified += emails.length
          }
        } catch (emailError) {
          console.error("Failed to send email notifications for selected students:", emailError)
        }
      }
    } else {
      return NextResponse.json({ success: false, message: "Invalid targeting_mode" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${openingsCreated} company opening(s) added successfully`,
      openingsCreated,
      studentsNotified: totalStudentsNotified,
    })
  } catch (error) {
    console.error("Company creation error:", error)
    return NextResponse.json({ success: false, message: "Failed to add company opening" }, { status: 500 })
  }
}
