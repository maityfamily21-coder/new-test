import { sql } from "@/lib/db"

type MailType = "seminar" | "message" | "company"

export async function enqueueEmails(studentEmails: string[], type: MailType, subject: string, content: string) {
  if (!studentEmails || studentEmails.length === 0) return { inserted: 0 }

  try {
    // Bulk insert all emails in a single query for performance
    const result = await sql`
      INSERT INTO email_queue (recipient_email, subject, content, type, status, next_attempt_at)
      SELECT * FROM UNNEST(
        ${studentEmails}::text[],
        ${Array(studentEmails.length).fill(subject)}::text[],
        ${Array(studentEmails.length).fill(content)}::text[],
        ${Array(studentEmails.length).fill(type)}::text[],
        ${Array(studentEmails.length).fill("pending")}::text[],
        ${Array(studentEmails.length).fill(new Date())}::timestamp[]
      ) AS t(recipient_email, subject, content, type, status, next_attempt_at)
      ON CONFLICT DO NOTHING
    `

    return { inserted: studentEmails.length }
  } catch (e) {
    console.error("[email-queue] bulk insert error:", e)
    // Fallback to one-by-one if bulk fails
    let inserted = 0
    for (const email of studentEmails) {
      try {
        await sql`
          INSERT INTO email_queue (recipient_email, subject, content, type, status, next_attempt_at)
          VALUES (${email}, ${subject}, ${content}, ${type}, 'pending', NOW())
        `
        inserted++
      } catch {
        // Skip duplicates or bad emails
      }
    }
    return { inserted }
  }
}
