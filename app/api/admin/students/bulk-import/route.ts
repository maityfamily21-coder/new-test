import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateQRTokensForStudent } from "@/lib/exam-qr-utils"
import { generateUniqueStudentCode } from "@/lib/student-code-generator"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 })
    }

    const csvText = await file.text()
    const lines = csvText.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim())

    const results = {
      total: lines.length - 1,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Get existing courses and interests for validation
    const courses = await sql`SELECT id, name FROM courses`
    const interests = await sql`SELECT id, name FROM interests`

    const courseMap = new Map(courses.map((c) => [c.name.toLowerCase(), c.id]))
    const interestMap = new Map(interests.map((i) => [i.name.toLowerCase(), i.id]))

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
        const student: any = {}

        headers.forEach((header, index) => {
          student[header] = values[index] || ""
        })

        // Validate required fields
        if (!student.full_name || !student.enrollment_number || !student.email) {
          results.errors.push(`Row ${i + 1}: Missing required fields`)
          results.failed++
          continue
        }

        // Get course ID
        const courseId = courseMap.get(student.course_name?.toLowerCase())
        if (!courseId) {
          results.errors.push(`Row ${i + 1}: Course "${student.course_name}" not found`)
          results.failed++
          continue
        }

        // Parse interests
        const interestNames = student.interests?.split(",").map((i: string) => i.trim()) || []
        const interestIds = []

        for (const interestName of interestNames) {
          const interestId = interestMap.get(interestName.toLowerCase())
          if (interestId) {
            interestIds.push(interestId)
          }
        }

        if (interestIds.length === 0 || interestIds.length > 5) {
          results.errors.push(`Row ${i + 1}: Must have 1-5 valid interests`)
          results.failed++
          continue
        }

        // Generate unique code for each student in bulk import
        const unique_code = await generateUniqueStudentCode()

        // Insert student
        const studentResult = await sql`
          INSERT INTO students (
            full_name, enrollment_number, course_id, email, phone_number,
            parent_phone_number, admission_semester, current_semester,
            resume_link, agreement_link, placement_status, company_name,
            placement_tenure_days, password, unique_code
          ) VALUES (
            ${student.full_name}, ${student.enrollment_number}, ${courseId}, ${student.email}, 
            ${student.phone_number}, ${student.parent_phone_number}, 
            ${Number.parseInt(student.admission_semester) || 1}, ${Number.parseInt(student.current_semester) || 1},
            ${student.resume_link}, ${student.agreement_link}, 
            ${student.placement_status || "Active"}, ${student.company_name},
            ${Number.parseInt(student.placement_tenure_days) || 0}, ${student.password}, ${unique_code}
          ) RETURNING id
        `

        const studentId = studentResult[0].id
        const currentSemester = Number.parseInt(student.current_semester) || 1

        // Insert interests
        for (const interestId of interestIds) {
          await sql`
            INSERT INTO student_interests (student_id, interest_id)
            VALUES (${studentId}, ${interestId})
          `
        }

        try {
          await generateQRTokensForStudent(studentId, courseId, currentSemester)
        } catch (qrError) {
          console.warn(`[MYT] QR generation warning for bulk import student ${studentId}:`, qrError)
          // Don't fail the entire import if QR generation fails
        }

        results.successful++
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error.message}`)
        results.failed++
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("Bulk import error:", error)
    return NextResponse.json({ success: false, message: "Import failed" }, { status: 500 })
  }
}
