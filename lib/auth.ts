import { sql } from "./db"

export async function authenticateAdmin(username: string, password: string) {
  try {
    const result = await sql`
      SELECT * FROM admins WHERE username = ${username} AND password = ${password}
    `
    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error("Admin authentication error:", error)
    return null
  }
}

export async function authenticateStudent(enrollmentNumber: string, password: string) {
  try {
    const result = await sql`
      SELECT s.*, c.name as course_name 
      FROM students s
      JOIN courses c ON s.course_id = c.id
      WHERE s.enrollment_number = ${enrollmentNumber} AND s.password = ${password}
    `
    if (result.length > 0) {
      console.log("[v0] authenticateStudent: Found student", result[0].enrollment_number)
      return result[0]
    }
    console.error("[v0] authenticateStudent: No student found for", enrollmentNumber)
    return null
  } catch (error) {
    console.error("Student authentication error:", error)
    return null
  }
}
