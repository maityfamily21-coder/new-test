import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendBccBatch } from "@/lib/email"

export const dynamic = "force-dynamic"

const BCC_BATCH_SIZE = 450
const BATCH_DELAY_MS = 300 // 300ms between batches to avoid SMTP throttling

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST() {
  let totalProcessed = 0
  let batchesSent = 0
  let recipientsSent = 0
  let failed = 0

  try {
    // Clean up old sent emails
    await sql`DELETE FROM email_queue WHERE status='sent' AND updated_at < NOW() - INTERVAL '1 hour'`

    // Reset stalled processing emails
    await sql`UPDATE email_queue
              SET status='pending', next_attempt_at=NOW(), updated_at=NOW()
              WHERE status='processing' AND updated_at < NOW() - INTERVAL '10 minutes'`

    while (true) {
      const pending = await sql`
        SELECT id, recipient_email, subject, content
        FROM email_queue
        WHERE status='pending' AND next_attempt_at <= NOW()
        ORDER BY subject, content, created_at ASC
        LIMIT 10000
      `

      if (!pending || pending.length === 0) {
        break // No more pending emails
      }

      const groupedByContent = new Map<string, any[]>()

      for (const job of pending) {
        const key = `${job.subject}|${job.content}`
        if (!groupedByContent.has(key)) {
          groupedByContent.set(key, [])
        }
        groupedByContent.get(key)!.push(job)
      }

      for (const [contentKey, jobs] of groupedByContent.entries()) {
        const [subject, content] = contentKey.split("|")

        // Mark all jobs in this group as processing
        const jobIds = jobs.map((j) => j.id)
        await sql`
          UPDATE email_queue
          SET status='processing', updated_at=NOW()
          WHERE id = ANY(${jobIds})
        `

        for (let i = 0; i < jobs.length; i += BCC_BATCH_SIZE) {
          const batchJobs = jobs.slice(i, i + BCC_BATCH_SIZE)
          const batchEmails = batchJobs.map((j) => j.recipient_email).filter((e) => e && e.trim())
          const batchJobIds = batchJobs.map((j) => j.id)

          if (batchEmails.length === 0) {
            // Mark as failed if no valid emails
            await sql`
              UPDATE email_queue
              SET status='failed', last_error='No valid email addresses', updated_at=NOW()
              WHERE id = ANY(${batchJobIds})
            `
            failed += batchJobIds.length
            continue
          }

          try {
            console.log(
              `[BCC Processor] Sending batch with ${batchEmails.length} recipients (${Math.ceil((i / jobs.length) * 100)}% of group)`,
            )

            const result = await sendBccBatch(batchEmails, subject, content)

            if (result.success) {
              // Mark all jobs in batch as sent
              await sql`
                UPDATE email_queue
                SET status='sent', updated_at=NOW()
                WHERE id = ANY(${batchJobIds})
              `
              recipientsSent += batchEmails.length
              batchesSent++
              console.log(
                `[BCC Processor] ✓ Batch ${batchesSent}: Successfully sent 1 email to ${batchEmails.length} recipients`,
              )
            } else {
              // Mark as failed if BCC send failed
              await sql`
                UPDATE email_queue
                SET status='failed', last_error=${result.error || "BCC send failed"}, updated_at=NOW()
                WHERE id = ANY(${batchJobIds})
              `
              failed += batchJobIds.length
              console.error(`[BCC Processor] ✗ Batch failed: ${result.error}`)
            }

            if (result.failedRecipients && result.failedRecipients.length > 0) {
              const failedEmails = result.failedRecipients
              await sql`
                UPDATE email_queue
                SET status='failed', last_error='Invalid email format', updated_at=NOW()
                WHERE recipient_email = ANY(${failedEmails})
              `
              failed += failedEmails.length
              console.warn(`[BCC Processor] Skipped ${failedEmails.length} invalid email addresses`)
            }

            totalProcessed += batchJobIds.length

            if (i + BCC_BATCH_SIZE < jobs.length) {
              await delay(BATCH_DELAY_MS)
            }
          } catch (err: any) {
            console.error(`[BCC Processor] Batch error:`, err?.message)
            // Mark batch as failed
            await sql`
              UPDATE email_queue
              SET status='failed', last_error=${err?.message || "Batch processing error"}, updated_at=NOW()
              WHERE id = ANY(${batchJobIds})
            `
            failed += batchJobIds.length
            totalProcessed += batchJobIds.length
          }
        }
      }
    }

    const [{ count: pendingFuture }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM email_queue
      WHERE status='pending'
    `

    if (pendingFuture > 0) {
      await delay(1000)
      try {
        fetch("/api/jobs/email/process", { method: "POST", cache: "no-store" }).catch(() => {})
      } catch {
        // ignore
      }
    }

    console.log(
      `[BCC Processor] Complete: ${batchesSent} batches sent to ${recipientsSent} recipients, ${failed} failed`,
    )

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      batchesSent,
      recipientsSent,
      failed,
      note: "BCC batch processing complete. 1 email = 450 recipients via BCC.",
    })
  } catch (error) {
    console.error("[bcc-processor] error:", error)
    return NextResponse.json({ success: false, message: "Processor failed" }, { status: 500 })
  }
}
