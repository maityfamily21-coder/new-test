import { neon, neonConfig } from "@neondatabase/serverless"
import { Pool } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

neonConfig.fetchConnectionCache = true

export const sql = neon(process.env.DATABASE_URL)

// Export db for compatibility with query() usage
export const db = new Pool({ connectionString: process.env.DATABASE_URL })

export type Student = {
  id: number
  full_name: string
  enrollment_number: string
  course_id: number
  course_name?: string
  email: string
  phone_number: string
  parent_phone_number: string
  admission_semester: number
  current_semester: number
  resume_link?: string
  agreement_link?: string
  placement_status: "Active" | "Placed"
  company_name?: string
  placement_tenure_days: number
  password: string
  created_at: string
  interests?: Interest[]
}

export type Course = {
  id: number
  name: string
  total_semesters: number
  created_at: string
}

export type Interest = {
  id: number
  name: string
  created_at: string
}

export type StudentApplication = {
  student_id: number
  student_name: string
  enrollment_number: string
  course_name: string
  applied_at: string
}

export type Company = {
  id: number
  name: string
  position: string
  description?: string
  interest_id: number | null
  interest_name?: string
  application_deadline: string
  created_at: string
  days_remaining?: number
  applications?: StudentApplication[]
  targeting_mode: "interest" | "course_semester" | "students"
  course_id?: number | null
  semester?: number | null
  course_name?: string
  opening_type: "job" | "internship"
  tenure_days?: number | null
  course_targets?: { course_id: number; semester: number; course_name: string | null }[]
}

export type Seminar = {
  id: number
  title: string
  description?: string
  interest_id: number
  interest_name?: string
  seminar_date: string
  created_at: string
}

export type Message = {
  id: number
  title: string
  content: string
  message_type: "interest" | "course_semester" | "students"
  interest_id?: number
  interest_name?: string
  course_id?: number
  course_name?: string
  semester?: number
  created_at: string
}

// Database connection helper
export async function getDb() {
  return db
}

// Query helper for Neon database operations
export async function query(text: string, params?: (string | number | boolean | null | undefined)[]): Promise<any> {
  try {
    const result = await db.query(text, params)
    return result
  } catch (error) {
    console.error("[DB] Query error:", error)
    throw error
  }
}
