import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")
    const tutorId = searchParams.get("tutorId")

    if (!subjectId || !tutorId) {
      return Response.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    const lectures = await sql`
      SELECT 
        l.id,
        l.title,
        l.description,
        l.lecture_date,
        s.name as subject_name,
        COUNT(DISTINCT la.id) as attendance_count,
        t.name as creator_name
      FROM lectures l
      JOIN subjects s ON l.subject_id = s.id
      LEFT JOIN lecture_tutors lt ON l.id = lt.lecture_id AND lt.is_creator = true
      LEFT JOIN tutors t ON lt.tutor_id = t.id
      LEFT JOIN lecture_attendance la ON l.id = la.lecture_id
      WHERE l.subject_id = ${Number(subjectId)} 
        AND l.tutor_id = ${Number(tutorId)}
      GROUP BY l.id, l.title, l.description, l.lecture_date, s.name, t.name
      ORDER BY l.lecture_date DESC
    `

    return Response.json({ success: true, lectures })
  } catch (error) {
    console.error("[MYT] API: Error fetching lectures:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch lectures",
        details: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[MYT] API: Failed to parse JSON:", parseError)
      return Response.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { subjectId, tutorId, title, description, lectureDate, lectureSlot, batchId } = body

    console.log("[MYT] API: Creating lecture with data:", {
      subjectId,
      tutorId,
      title,
      lectureDate,
      lectureSlot, // This is now a string like "09:15"
      batchId,
    })

    if (!subjectId || !tutorId || !title || !lectureDate) {
      console.error("[MYT] API: Missing required fields", { subjectId, tutorId, title, lectureDate })
      return Response.json(
        { success: false, error: "Missing required fields: subjectId, tutorId, title, lectureDate" },
        { status: 400 },
      )
    }

    if (!lectureSlot) {
      return Response.json({ success: false, error: "Missing required field: lectureSlot" }, { status: 400 })
    }

    // ----------------------------------------------------------------------
    // NEW: Parse "HH:MM" String
    // ----------------------------------------------------------------------
    // Check if the slot is in the expected string format
    if (typeof lectureSlot !== 'string' || !lectureSlot.includes(':')) {
         return Response.json({ success: false, error: "Invalid slot format. Expected 'HH:MM'" }, { status: 400 })
    }

    // Extract hour and minute
    const [hoursStr, minutesStr] = lectureSlot.split(':')
    const slotHour = parseInt(hoursStr)
    const slotMinute = parseInt(minutesStr)

    // Note: We removed the strict server-side IST hour check and the < 7 || > 18 check.
    // This allows the frontend to control the 55-minute window and the new 20:15 slot 
    // without the server rejecting valid requests.

    // ----------------------------------------------------------------------

    const parsedSubjectId = Number.parseInt(String(subjectId))
    const parsedTutorId = Number.parseInt(String(tutorId))
    const parsedBatchId = batchId ? Number.parseInt(String(batchId)) : null

    // Construct the Date object using the parsed Hour and Minute
    const [year, month, day] = lectureDate.split("-")
    const lectureDateWithTime = new Date(
      Number.parseInt(year),
      Number.parseInt(month) - 1,
      Number.parseInt(day),
      slotHour,   // Use the parsed hour
      slotMinute, // Use the parsed minute
      0,
    )
    const lectureDateString = lectureDateWithTime.toISOString()

    console.log("[MYT] API: Parsed lecture date:", lectureDateString)

    const result = await sql`
      INSERT INTO lectures (subject_id, tutor_id, title, description, lecture_date, batch_id)
      VALUES (${parsedSubjectId}, ${parsedTutorId}, ${title}, ${description || null}, ${lectureDateString}, ${parsedBatchId})
      RETURNING id, title, description, lecture_date, batch_id
    `

    const newLectureId = result[0].id

    await sql`
      INSERT INTO lecture_tutors (lecture_id, tutor_id, is_creator)
      VALUES (${newLectureId}, ${parsedTutorId}, true)
    `

    console.log(
      "[MYT] API: Successfully created lecture ID:",
      newLectureId,
      "with slot:",
      lectureSlot,
      "batch_id:",
      parsedBatchId,
    )

    return Response.json({ success: true, lecture: result[0] })
  } catch (error) {
    console.error("[MYT] API: Unexpected error creating lecture:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to create lecture",
        details: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    )
  }
}
