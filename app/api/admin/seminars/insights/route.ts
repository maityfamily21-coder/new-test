import { NextResponse, type NextRequest } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const by = searchParams.get("by")

    // Detect optional columns to stay compatible with older schemas
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'seminars'
        AND column_name IN ('course_id','semester','speaker_name')
    `
    const hasCourseId = (columns as any[]).some((c) => c.column_name === "course_id")
    const hasSemester = (columns as any[]).some((c) => c.column_name === "semester")
    const hasSpeakerName = (columns as any[]).some((c) => c.column_name === "speaker_name")

    // Filters
    if (by === "course_semester") {
      const courseId = Number.parseInt(searchParams.get("course_id") || "", 10)
      const semester = Number.parseInt(searchParams.get("semester") || "", 10)
      if (!Number.isFinite(courseId) || !Number.isFinite(semester)) {
        return NextResponse.json({ success: false, message: "Invalid course or semester" }, { status: 400 })
      }

      // Include: seminars that either directly have course_id/semester (legacy) OR are mapped via seminar_course_semesters
      const rows = await sql`
        WITH targets AS (
          ${
            hasCourseId && hasSemester
              ? sql`
              SELECT id
              FROM seminars
              WHERE course_id = ${courseId} AND semester = ${semester}
            `
              : sql`
              SELECT NULL::int AS id
              WHERE FALSE
            `
          }
          UNION
          SELECT scs.seminar_id AS id
          FROM seminar_course_semesters scs
          WHERE scs.course_id = ${courseId} AND scs.semester = ${semester}
        ),
        agg AS (
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
          s.seminar_date,
          ${hasSpeakerName ? sql`s.speaker_name` : sql`NULL AS speaker_name`},
          i.name AS interest_name
        FROM seminars s
        JOIN targets t ON t.id = s.id
        LEFT JOIN interests i ON i.id = s.interest_id
        ORDER BY s.seminar_date DESC
      `
      return NextResponse.json({
        success: true,
        total: (rows as any[]).length,
        items: rows,
      })
    }

    if (by === "speaker") {
      const speaker = (searchParams.get("speaker") || "").trim()
      if (!hasSpeakerName) {
        return NextResponse.json({ success: true, total: 0, items: [] })
      }
      if (!speaker) {
        return NextResponse.json({ success: false, message: "Speaker name is required" }, { status: 400 })
      }

      // Build target display similar to seminars list (Multiple, single, or direct)
      const rows = await sql`
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
          s.seminar_date,
          s.speaker_name,
          i.name AS interest_name,
          CASE
            WHEN COALESCE(a.combo_count, 0) > 1 THEN 'Multiple courses (' || a.combo_count || ')'
            WHEN COALESCE(a.combo_count, 0) = 1 THEN c2.name || ' - Semester ' || sm.semester
            ${
              hasCourseId && hasSemester
                ? sql`WHEN s.course_id IS NOT NULL AND s.semester IS NOT NULL THEN c.name || ' - Semester ' || s.semester`
                : sql``
            }
            ELSE ''
          END AS course_semester
        FROM seminars s
        LEFT JOIN interests i ON i.id = s.interest_id
        LEFT JOIN courses c ON ${hasCourseId ? sql`c.id = s.course_id` : sql`FALSE`}
        LEFT JOIN agg a ON a.seminar_id = s.id
        LEFT JOIN single_map sm ON sm.seminar_id = s.id
        LEFT JOIN courses c2 ON c2.id = sm.course_id
        WHERE s.speaker_name ILIKE ${speaker}
        ORDER BY s.seminar_date DESC
      `
      return NextResponse.json({
        success: true,
        total: (rows as any[]).length,
        items: rows,
      })
    }

    if (by === "interest") {
      const interestId = Number.parseInt(searchParams.get("interest_id") || "", 10)
      if (!Number.isFinite(interestId)) {
        return NextResponse.json({ success: false, message: "Invalid interest id" }, { status: 400 })
      }

      const rows = await sql`
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
          s.seminar_date,
          ${hasSpeakerName ? sql`s.speaker_name` : sql`NULL AS speaker_name`},
          i.name AS interest_name,
          CASE
            WHEN COALESCE(a.combo_count, 0) > 1 THEN 'Multiple courses (' || a.combo_count || ')'
            WHEN COALESCE(a.combo_count, 0) = 1 THEN c2.name || ' - Semester ' || sm.semester
            ${
              hasCourseId && hasSemester
                ? sql`WHEN s.course_id IS NOT NULL AND s.semester IS NOT NULL THEN c.name || ' - Semester ' || s.semester`
                : sql``
            }
            ELSE ''
          END AS course_semester
        FROM seminars s
        JOIN interests i ON i.id = s.interest_id
        LEFT JOIN courses c ON ${hasCourseId ? sql`c.id = s.course_id` : sql`FALSE`}
        LEFT JOIN agg a ON a.seminar_id = s.id
        LEFT JOIN single_map sm ON sm.seminar_id = s.id
        LEFT JOIN courses c2 ON c2.id = sm.course_id
        WHERE s.interest_id = ${interestId}
        ORDER BY s.seminar_date DESC
      `
      return NextResponse.json({
        success: true,
        total: (rows as any[]).length,
        items: rows,
      })
    }

    // Default: return options and summary
    const [courses, interests] = await Promise.all([
      sql`SELECT id, name, total_semesters FROM courses ORDER BY name ASC`,
      sql`SELECT id, name FROM interests ORDER BY name ASC`,
    ])

    const speakers = hasSpeakerName
      ? await sql`
          SELECT DISTINCT speaker_name
          FROM seminars
          WHERE speaker_name IS NOT NULL AND TRIM(speaker_name) <> ''
          ORDER BY speaker_name ASC
        `
      : []

    const [{ count: totalSeminars }] = await sql`SELECT COUNT(*)::int AS count FROM seminars`

    const [{ count: uniqueSpeakers }] = hasSpeakerName
      ? await sql`SELECT COUNT(DISTINCT speaker_name)::int AS count FROM seminars WHERE speaker_name IS NOT NULL AND TRIM(speaker_name) <> ''`
      : [{ count: 0 } as any]

    const [{ count: totalCoursesCovered }] = await sql`
      WITH u AS (
        SELECT DISTINCT course_id FROM seminar_course_semesters
        UNION
        SELECT DISTINCT course_id FROM seminars WHERE ${hasCourseId ? sql`course_id IS NOT NULL` : sql`FALSE`}
      )
      SELECT COUNT(*)::int AS count FROM u
    `

    const most = await sql`
      SELECT i.name, COUNT(*)::int AS cnt
      FROM seminars s
      JOIN interests i ON i.id = s.interest_id
      GROUP BY i.name
      ORDER BY cnt DESC
      LIMIT 1
    `
    const mostFrequentInterest = (most as any[]).length > 0 ? most[0].name : null

    return NextResponse.json({
      success: true,
      options: {
        courses,
        interests,
        speakers: (speakers as any[]).map((r: any) => r.speaker_name),
      },
      summary: {
        totalSeminars,
        uniqueSpeakers: Number(uniqueSpeakers),
        totalCoursesCovered,
        mostFrequentInterest,
      },
    })
  } catch (error) {
    console.error("Seminar insights error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch insights" }, { status: 500 })
  }
}
