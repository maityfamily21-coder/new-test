import nodemailer from "nodemailer"

const rateLimitPerMinute = (() => {
  const perSec = Number(process.env.SMTP_RATE_LIMIT_PER_SEC || 0)
  if (!isNaN(perSec) && perSec > 0) return Math.floor(perSec * 60)
  return undefined
})()

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  pool: true,
  maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 5), // Increased from 1 to 5 for parallel sends
  rateDelta: 60000,
  ...(typeof rateLimitPerMinute === "number" ? { rateLimit: rateLimitPerMinute } : {}),
})

function buildEmailHtml(subject: string, content: string) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0px 3px 10px rgba(0,0,0,0.1);">
          <div style="text-align:center; background-color:#003366; padding:10px;">
            <img src="cid:gucpc_logo" width="120" alt="GUCPC Logo">
          </div>

          <div style="padding: 20px;">
            <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 20px;">${subject}</h2>

            <div style="color: #374151; line-height: 1.6; margin-top: 10px;">
              ${content}
            </div>

            <p style="text-align: center; margin-top: 20px;">
              <a href="https://gucpc-placement.vercel.app/student/login" style="background:#003366;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Login Now</a>
            </p>

            <p style="margin-top: 24px; color:#374151;">
              Best Regards,<br>
              <b>Placement Department, Technical Team</b><br>
              Gujarat University Centre for Professional Courses (GUCPC)<br>
            </p>
          </div>

          <div style="text-align:center; background-color:#003366; color:white; padding:8px;">
            © ${new Date().getFullYear()} Gujarat University Centre for Professional Courses - All Rights Reserved
          </div>
        </div>
      </body>
    </html>
  `
}

function isObviouslyInvalidEmail(address: string) {
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
}

function isPermanentEmailError(err: any) {
  const responseCode = Number(err?.responseCode || err?.statusCode || 0)
  const code = String(err?.code || "").toUpperCase()
  const msg = String(err?.response || err?.message || "").toLowerCase()

  if ([550, 551, 553, 554].includes(responseCode)) return true
  if (code === "EENVELOPE") return true
  if (
    msg.includes("5.1.1") ||
    msg.includes("5.1.0") ||
    msg.includes("user unknown") ||
    msg.includes("no such user") ||
    msg.includes("recipient address rejected") ||
    msg.includes("mailbox unavailable") ||
    msg.includes("invalid recipient")
  ) {
    return true
  }
  return false
}

export async function sendBccBatch(
  bccRecipients: string[],
  subject: string,
  content: string,
): Promise<{ success: boolean; messageId?: string; failedRecipients?: string[]; error?: string }> {
  try {
    if (!bccRecipients || bccRecipients.length === 0) {
      return { success: false, error: "No recipients provided" }
    }

    // Filter out invalid emails
    const validRecipients = bccRecipients.filter((email) => !isObviouslyInvalidEmail(email))
    const failedRecipients = bccRecipients.filter((email) => isObviouslyInvalidEmail(email))

    if (validRecipients.length === 0) {
      return { success: false, error: "All recipients have invalid email format", failedRecipients }
    }

    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || "GUCPC Placement Portal",
        address: process.env.SMTP_FROM || process.env.SMTP_USER || "placement.cpc@gujaratuniversity.ac.in",
      },
      to: process.env.SMTP_FROM || process.env.SMTP_USER || "placement.cpc@gujaratuniversity.ac.in", // Send to self
      bcc: validRecipients, // All recipients in BCC
      subject,
      html: buildEmailHtml(subject, content),
      attachments: [
        {
          filename: "gucpc-logo.png",
          path: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gucpc-logo-PJT99TzmWaL3786XFw5sidxb8DpTxw.png",
          cid: "gucpc_logo",
        },
      ],
    }

    const result = await transporter.sendMail(mailOptions)
    console.log(`[BCC Batch] Sent to ${validRecipients.length} recipients. MessageId: ${result.messageId}`)

    return {
      success: true,
      messageId: result.messageId,
      failedRecipients: failedRecipients.length > 0 ? failedRecipients : undefined,
    }
  } catch (error: any) {
    console.error(`[BCC Batch] Error sending batch:`, error)
    return {
      success: false,
      error: error?.message || "Unknown error",
      failedRecipients: bccRecipients,
    }
  }
}

export async function sendEmail(to: string, subject: string, content: string) {
  try {
    if (isObviouslyInvalidEmail(to)) {
      return {
        success: false,
        message: "Invalid email format",
        permanent: true,
        code: "INVALID_ADDRESS",
      }
    }

    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || "GUCPC Placement Portal",
        address: process.env.SMTP_FROM || process.env.SMTP_USER || "placement.cpc@gujaratuniversity.ac.in",
      },
      to,
      subject,
      html: buildEmailHtml(subject, content),
      attachments: [
        {
          filename: "gucpc-logo.png",
          path: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gucpc-logo-PJT99TzmWaL3786XFw5sidxb8DpTxw.png",
          cid: "gucpc_logo",
        },
      ],
    }

    const result = await transporter.sendMail(mailOptions)
    console.log(`Email sent successfully to: ${to}`)
    return { success: true, message: "Email sent successfully", messageId: result.messageId }
  } catch (error: any) {
    const permanent = isPermanentEmailError(error)
    console.error(`Email sending failed to: ${to}`, error)
    return {
      success: false,
      message: `Failed to send email: ${error?.message || "unknown error"}`,
      permanent,
      code: error?.code,
      responseCode: error?.responseCode,
    }
  }
}

export async function sendBulkEmails(emails: { to: string; subject: string; content: string }[]) {
  const results = []

  for (const email of emails) {
    try {
      const result = await sendEmail(email.to, email.subject, email.content)
      results.push({ ...email, ...result })
    } catch (error: any) {
      results.push({ ...email, success: false, error: error?.message || "unknown error" })
    }
  }

  return results
}

export async function sendStudentNotification(
  studentEmails: string[],
  type: "seminar" | "message" | "company",
  title: string,
  description: string,
  additionalInfo?: string,
) {
  const subjects = {
    seminar: `⏰ New Seminar: ${title}`,
    message: `📢 Important Message: ${title}`,
    company: `🏢 New Job Opening: ${title}`,
  }

  const icons = {
    seminar: "⏰",
    message: "📢",
    company: "🏢",
  }

  const content = `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 48px; text-align: center; margin-bottom: 15px;">${icons[type]}</div>
      <h3 style="color: #1f2937; margin: 0 0 15px 0;">${title}</h3>
      <p style="color: #374151; margin: 0 0 15px 0;">${description}</p>
      ${additionalInfo ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 15px;"><p style="margin: 0; color: #4b5563;"><strong>Additional Information:</strong><br>${additionalInfo}</p></div>` : ""}
    </div>
  `

  const emails = studentEmails.map((email) => ({
    to: email,
    subject: subjects[type],
    content: content,
  }))

  return await sendBulkEmails(emails)
}

export async function sendPasswordResetOTP(
  email: string,
  otp: string,
  userName?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const userGreeting = userName ? `Hi ${userName},` : "Hello,"

  const content = `
    <div style="margin-bottom: 20px;">
      <p style="color: #374151; margin: 0 0 15px 0;">${userGreeting}</p>
      
      <p style="color: #374151; margin: 0 0 15px 0;">
        You requested a password reset for your account. Use the OTP below to reset your password:
      </p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <div style="font-size: 36px; font-weight: bold; color: #003366; letter-spacing: 4px; font-family: 'Courier New', monospace;">
          ${otp}
        </div>
      </div>

      <p style="color: #666; font-size: 14px; margin: 15px 0;">
        <strong>This OTP will expire in 5 minutes.</strong> Please do not share this code with anyone.
      </p>

      <p style="color: #374151; margin: 20px 0;">
        If you did not request a password reset, please ignore this email and contact our support team immediately.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ⚠️ <strong>Security Alert:</strong> Always verify that you initiated this request. Never share your OTP with anyone.
        </p>
      </div>
    </div>
  `

  return await sendEmail(email, "🔐 Password Reset OTP - GUCPC", content)
}

export async function sendPasswordResetConfirmation(
  email: string,
  newPassword: string,
  userName?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const userGreeting = userName ? `Hi ${userName},` : "Hello,"

  const content = `
    <div style="margin-bottom: 20px;">
      <p style="color: #374151; margin: 0 0 15px 0;">${userGreeting}</p>
      
      <p style="color: #374151; margin: 0 0 15px 0;">
        Your password has been successfully reset. Your new temporary password is:
      </p>

      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <div style="font-size: 20px; font-family: 'Courier New', monospace; color: #003366; word-break: break-all;">
          <strong>${newPassword}</strong>
        </div>
      </div>

      <div style="background: #dbeafe; border-left: 4px solid #0284c7; padding: 12px; margin: 15px 0; border-radius: 4px;">
        <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
          💡 <strong>Next Steps:</strong>
          <br>1. Log in with your new password
          <br>2. Go to your account settings
          <br>3. Change your password to something secure
        </p>
      </div>

      <p style="color: #374151; margin: 20px 0;">
        <strong>Important Security Notes:</strong>
      </p>
      
      <ul style="color: #374151; margin: 15px 0;">
        <li style="margin-bottom: 8px;">This password is temporary. Please change it immediately after logging in.</li>
        <li style="margin-bottom: 8px;">Never share your password with anyone.</li>
        <li style="margin-bottom: 8px;">If you did not request this password reset, please contact our support team immediately.</li>
      </ul>

      <p style="color: #374151; margin: 20px 0;">
        If you have any questions or concerns, please reach out to our support team.
      </p>
    </div>
  `

  return await sendEmail(email, "✅ Password Reset Successful - GUCPC", content)
}
