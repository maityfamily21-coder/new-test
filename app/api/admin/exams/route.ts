import { neon } from "@neondatabase/serverless"
import { validateAdminAuth } from "@/lib/admin-auth"

const sql = neon(process.env.DATABASE_URL!)

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

    let query = `
      SELECT 
        e.id,
        e.exam_name,
        e.exam_date,
        e.course_id,
        e.semester,
        c.name as course_name,
        COALESCE(json_agg(
          json_build_object(
            'subject_id', es.subject_id,
            'subject_name', s.name,
            'total_marks', es.total_marks,
            'exam_date', es.exam_date,
            'exam_end_time', es.exam_end_time
          ) ORDER BY s.name
        ) FILTER (WHERE es.subject_id IS NOT NULL), '[]'::json) as subjects
      FROM exams e
      LEFT JOIN exam_subjects es ON e.id = es.exam_id
      LEFT JOIN subjects s ON es.subject_id = s.id
      LEFT JOIN courses c ON e.course_id = c.id
    `

    const params: any[] = []
    const conditions: string[] = []

    if (admin.role === "course_admin" && admin.assignedCourses && admin.assignedCourses.length > 0) {
      conditions.push(`e.course_id = ANY($${params.length + 1})`)
      params.push(admin.assignedCourses)
    }

    if (courseId) {
      conditions.push(`e.course_id = $${params.length + 1}`)
      params.push(Number.parseInt(courseId))
    }
    if (semester) {
      conditions.push(`e.semester = $${params.length + 1}`)
      params.push(Number.parseInt(semester))
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += " GROUP BY e.id, e.exam_name, e.exam_date, e.course_id, e.semester, c.name ORDER BY e.exam_date DESC"

    const exams = await sql.query(query, params)
    return Response.json(exams || [])
  } catch (error) {
    console.error("Error fetching exams:", error)
    return Response.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  console.log("[MYT] POST /api/admin/exams - Request received")
  console.log("[MYT] Headers:", Object.fromEntries(request.headers.entries()))

  const authResult = await validateAdminAuth(request as any)
  console.log("[MYT] Auth result:", authResult)

  if (!authResult.success || !authResult.admin) {
    console.log("[MYT] Authentication failed:", authResult.error)
    return Response.json({ message: "Unauthorized", error: authResult.error }, { status: 401 })
  }

  const admin = authResult.admin
  console.log("[MYT] Admin authenticated:", admin.username, admin.role)

  let requestBody: any = {}
  try {
    requestBody = await request.json()
    console.log("[MYT] Request body:", JSON.stringify(requestBody, null, 2))

    const { course_id, semester, exam_name, subjects } = requestBody

    if (!course_id || course_id === "" || isNaN(course_id)) {
      console.error("[MYT] Invalid course_id:", course_id)
      return Response.json({ message: "Invalid course_id" }, { status: 400 })
    }

    if (admin.role === "course_admin") {
      if (!admin.assignedCourses || !admin.assignedCourses.includes(Number(course_id))) {
        return Response.json({ message: "You don't have access to create exams for this course" }, { status: 403 })
      }
    }

    if (!semester || semester === "" || isNaN(semester)) {
      console.error("[MYT] Invalid semester:", semester)
      return Response.json({ message: "Invalid semester" }, { status: 400 })
    }

    if (!exam_name || exam_name === "") {
      console.error("[MYT] Invalid exam_name:", exam_name)
      return Response.json({ message: "Invalid exam_name" }, { status: 400 })
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      console.error("[MYT] Invalid subjects:", subjects)
      return Response.json({ message: "Invalid or empty subjects array" }, { status: 400 })
    }

    const firstSubjectDate = subjects[0]?.exam_date
    if (!firstSubjectDate || firstSubjectDate === "") {
      console.error("[MYT] No exam_date in any subject")
      return Response.json({ message: "At least one subject must have an exam date" }, { status: 400 })
    }

    const courseIdNum = Number(course_id)
    const semesterNum = Number(semester)

    console.log("[MYT] Checking if course exists...")
    const courseExists = await sql`SELECT id FROM courses WHERE id = ${courseIdNum} LIMIT 1`
    if (!courseExists || courseExists.length === 0) {
      console.error("[MYT] Course not found:", courseIdNum)
      return Response.json({ message: "Course not found" }, { status: 400 })
    }
    console.log("[MYT] Course verified")

    console.log("[MYT] Validating subjects...")
    for (const subj of subjects) {
      if (!subj.subject_id || !subj.total_marks || !subj.exam_date || !subj.exam_end_time) {
        console.error("[MYT] Invalid subject data:", subj)
        return Response.json(
          { message: "Invalid subject data - all subjects must have id, marks, start time, and end time" },
          { status: 400 },
        )
      }

      const subjExists =
        await sql`SELECT id FROM subjects WHERE id = ${subj.subject_id} AND course_id = ${courseIdNum} LIMIT 1`
      if (!subjExists || subjExists.length === 0) {
        console.error("[MYT] Subject not found:", subj.subject_id)
        return Response.json({ message: `Subject ${subj.subject_id} not found for course` }, { status: 400 })
      }
    }
    console.log("[MYT] All subjects validated")

    console.log("[MYT] Creating exam...")
    let examId: number
    try {
      const examResult = await sql`
        INSERT INTO exams (course_id, semester, exam_name, exam_date) 
        VALUES (${courseIdNum}, ${semesterNum}, ${exam_name}, ${firstSubjectDate})
        RETURNING id`

      if (!examResult || examResult.length === 0) {
        throw new Error("Failed to insert exam")
      }

      examId = examResult[0].id
      console.log("[MYT] Exam created with ID:", examId)
    } catch (examErr: any) {
      console.error("[MYT] Exam creation error:", examErr.message)
      return Response.json(
        { message: "Failed to create exam: " + (examErr.message || "Unknown error") },
        { status: 500 },
      )
    }

    console.log("[MYT] Adding exam subjects...")
    try {
      for (const subject of subjects) {
        const marks = Number(subject.total_marks)
        if (isNaN(marks) || marks <= 0) {
          console.error("[MYT] Invalid marks for subject:", subject.subject_id)
          return Response.json({ message: "Invalid total_marks value" }, { status: 400 })
        }

        const subjectExamDate = subject.exam_date
        const subjectExamEndTime = subject.exam_end_time
        console.log("[MYT] Inserting subject with start date:", subjectExamDate, "end time:", subjectExamEndTime)

        await sql`
          INSERT INTO exam_subjects (exam_id, subject_id, total_marks, exam_date, exam_end_time) 
          VALUES (${examId}, ${subject.subject_id}, ${marks}, ${subjectExamDate}, ${subjectExamEndTime})
          ON CONFLICT (exam_id, subject_id) DO UPDATE 
          SET total_marks = ${marks}, exam_date = ${subjectExamDate}, exam_end_time = ${subjectExamEndTime}`
      }
      console.log("[MYT] Exam subjects added")
    } catch (subjErr: any) {
      console.error("[MYT] Subject insertion error:", subjErr.message)
      return Response.json(
        { message: "Failed to add exam subjects: " + (subjErr.message || "Unknown error") },
        { status: 500 },
      )
    }

    try {
      console.log("[MYT] Starting QR token generation...")
      const students =
        await sql`SELECT id FROM students WHERE course_id = ${courseIdNum} AND current_semester = ${semesterNum}`

      console.log(`[MYT] Found ${students?.length || 0} students`)

      if (students && students.length > 0) {
        const BATCH_SIZE = 100

        for (let i = 0; i < students.length; i += BATCH_SIZE) {
          const batch = students.slice(i, i + BATCH_SIZE)

          for (const student of batch) {
            for (const subject of subjects) {
              const token = `${examId}_${student.id}_${subject.subject_id}_${Date.now()}`
              const qrData = JSON.stringify({
                studentId: student.id,
                examId: examId,
                courseId: courseIdNum,
                semester: semesterNum,
                subjectId: subject.subject_id,
              })

              try {
                await sql`
                  INSERT INTO exam_qr_tokens (exam_id, student_id, subject_id, token, qr_data) 
                  VALUES (${examId}, ${student.id}, ${subject.subject_id}, ${token}, ${qrData})
                  ON CONFLICT (exam_id, student_id, subject_id) 
                  DO UPDATE SET token = ${token}, qr_data = ${qrData}`
              } catch (tokenErr) {
                console.warn(`[MYT] Warning inserting token for student ${student.id}:`, tokenErr)
              }
            }
          }
          console.log(`[MYT] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}`)
        }
      }
      console.log("[MYT] QR token generation completed")
    } catch (qrErr: any) {
      console.warn("[MYT] Non-critical QR error (exam still created):", qrErr.message)
    }

    console.log("[MYT] Exam creation successful!")
    return Response.json({ message: "Exam created successfully", exam_id: examId }, { status: 201 })
  } catch (error: any) {
    console.error("[MYT] Uncaught error:", error)
    console.error("[MYT] Request body:", requestBody)
    return Response.json(
      {
        message: "Internal server error",
        error: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
