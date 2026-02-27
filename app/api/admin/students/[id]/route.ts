import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"
import { generateQRTokensForStudent } from "@/lib/exam-qr-utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const studentId = params.id

    // Get student with course information
    const students = await sql`
      SELECT 
        s.*,
        c.name as course_name
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = ${studentId}
    `

    if (students.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const student = students[0]

    if (admin.role === "course_admin") {
      if (!admin.assignedCourses || !admin.assignedCourses.includes(student.course_id)) {
        return NextResponse.json({ success: false, message: "Access denied to this student" }, { status: 403 })
      }
    }

    // Get student interests
    const interests = await sql`
      SELECT i.id, i.name
      FROM interests i
      JOIN student_interests si ON i.id = si.interest_id
      WHERE si.student_id = ${studentId}
    `

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        interests: interests,
      },
    })
  } catch (error) {
    console.error("Student fetch error:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch student" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const studentId = params.id
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

    const oldStudentData = await sql`
      SELECT course_id, current_semester FROM students WHERE id = ${studentId}
    `

    if (oldStudentData.length === 0) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
    }

    const oldCourseId = oldStudentData?.[0]?.course_id
    const oldSemester = oldStudentData?.[0]?.current_semester

    if (admin.role === "course_admin") {
      if (!admin.assignedCourses || !admin.assignedCourses.includes(oldCourseId)) {
        return NextResponse.json({ success: false, message: "Access denied to this student" }, { status: 403 })
      }
      if (course_id !== oldCourseId && !admin.assignedCourses.includes(Number(course_id))) {
        return NextResponse.json(
          { success: false, message: "You don't have access to move student to this course" },
          { status: 403 },
        )
      }
    }

    // Update student
    await sql`
      UPDATE students SET
        full_name = ${full_name},
        enrollment_number = ${enrollment_number},
        course_id = ${course_id},
        email = ${email},
        phone_number = ${phone_number},
        parent_phone_number = ${parent_phone_number},
        admission_semester = ${admission_semester},
        current_semester = ${current_semester},
        resume_link = ${resume_link},
        agreement_link = ${agreement_link},
        placement_status = ${placement_status},
        company_name = ${company_name},
        placement_tenure_days = ${placement_tenure_days},
        password = ${password}
      WHERE id = ${studentId}
    `

    // Update student interests
    await sql`DELETE FROM student_interests WHERE student_id = ${studentId}`

    if (interests && interests.length > 0) {
      for (const interestId of interests) {
        await sql`
          INSERT INTO student_interests (student_id, interest_id)
          VALUES (${studentId}, ${interestId})
        `
      }
    }

    const courseChanged = oldCourseId !== course_id
    const semesterChanged = oldSemester !== current_semester

    if (courseChanged || semesterChanged) {
      console.log(`[MYT] Course or semester changed for student ${studentId}, generating QR tokens`)
      await generateQRTokensForStudent(Number(studentId), Number(course_id), Number(current_semester))
    }

    return NextResponse.json({ success: true, message: "Student updated successfully" })
  } catch (error) {
    console.error("Student update error:", error)
    return NextResponse.json({ success: false, message: "Failed to update student" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  const admin = authResult.admin

  try {
    const studentId = params.id

    if (admin.role === "course_admin") {
      const studentData = await sql`SELECT course_id FROM students WHERE id = ${studentId}`
      if (studentData.length === 0) {
        return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 })
      }
      if (!admin.assignedCourses || !admin.assignedCourses.includes(studentData[0].course_id)) {
        return NextResponse.json({ success: false, message: "Access denied to delete this student" }, { status: 403 })
      }
    }

    await sql`DELETE FROM students WHERE id = ${studentId}`

    return NextResponse.json({ success: true, message: "Student deleted successfully" })
  } catch (error) {
    console.error("Student delete error:", error)
    return NextResponse.json({ success: false, message: "Failed to delete student" }, { status: 500 })
  }
}
