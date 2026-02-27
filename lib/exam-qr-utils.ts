import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Generate QR tokens for a newly added or updated student
 * This ensures students added after exam creation still get their QR codes
 */
export async function generateQRTokensForStudent(studentId: number, courseId: number, semester: number): Promise<void> {
  try {
    console.log(`[MYT] Generating QR tokens for student ${studentId} in course ${courseId}, semester ${semester}`)

    // Find all exams for this course and semester
    const exams = await sql`
      SELECT id FROM exams 
      WHERE course_id = ${courseId} 
      AND semester = ${semester}
    `

    if (!exams || exams.length === 0) {
      console.log(`[MYT] No exams found for course ${courseId}, semester ${semester}`)
      return
    }

    console.log(`[MYT] Found ${exams.length} exams for course ${courseId}, semester ${semester}`)

    // For each exam, get all subjects and create QR tokens
    for (const exam of exams) {
      const subjects = await sql`
        SELECT subject_id FROM exam_subjects 
        WHERE exam_id = ${exam.id}
      `

      console.log(`[MYT] Exam ${exam.id} has ${subjects?.length || 0} subjects`)

      if (subjects && subjects.length > 0) {
        for (const subject of subjects) {
          const token = `${exam.id}_${studentId}_${subject.subject_id}_${Date.now()}`
          const qrData = JSON.stringify({
            studentId: studentId,
            examId: exam.id,
            courseId: courseId,
            semester: semester,
            subjectId: subject.subject_id,
          })

          try {
            await sql`
              INSERT INTO exam_qr_tokens (exam_id, student_id, subject_id, token, qr_data) 
              VALUES (${exam.id}, ${studentId}, ${subject.subject_id}, ${token}, ${qrData})
              ON CONFLICT (exam_id, student_id, subject_id) 
              DO UPDATE SET token = ${token}, qr_data = ${qrData}
            `
            console.log(
              `[MYT] QR token created for student ${studentId}, exam ${exam.id}, subject ${subject.subject_id}`,
            )
          } catch (tokenErr) {
            console.warn(`[MYT] Warning inserting token for student ${studentId}:`, tokenErr)
          }
        }
      }
    }

    console.log(`[MYT] QR token generation completed for student ${studentId}`)
  } catch (error) {
    console.error("[MYT] Error generating QR tokens for student:", error)
    // Don't throw - this is non-critical for student creation
  }
}
