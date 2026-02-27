import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" })
  response.cookies.delete("accounts_personnel_token")
  return response
}
