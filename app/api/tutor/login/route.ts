import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error("CAPTCHA verification error:", error)
    return false
  }
}

function generateSessionToken(username: string, password: string): string {
  const credentials = `${username}:${password}`
  return Buffer.from(credentials, "utf-8").toString("base64")
}

export async function POST(request: Request) {
  try {
    const { username, password, token } = await request.json()

    if (!token) {
      return Response.json({ success: false, error: "CAPTCHA verification required" }, { status: 400 })
    }

    const captchaValid = await verifyCaptcha(token)
    if (!captchaValid) {
      return Response.json({ success: false, error: "CAPTCHA verification failed" }, { status: 400 })
    }

    if (!username || !password) {
      return Response.json({ success: false, error: "Missing credentials" }, { status: 400 })
    }

    const tutors = await sql`
      SELECT id, name, username, department FROM tutors WHERE username = ${username} AND password = ${password}
    `

    if (tutors.length === 0) {
      return Response.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    const tutor = tutors[0]
    const sessionToken = generateSessionToken(username, password)

    return Response.json({
      success: true,
      token: sessionToken,
      tutor: {
        id: tutor.id,
        name: tutor.name,
        department: tutor.department,
      },
    })
  } catch (error) {
    console.error("Error during tutor login:", error)
    return Response.json({ success: false, error: "Login failed" }, { status: 500 })
  }
}
