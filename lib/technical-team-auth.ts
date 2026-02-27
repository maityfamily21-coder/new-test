import type { NextRequest } from "next/server"
import { validateTechnicalAuth, type AuthenticatedTechnicalUser } from "./technical-auth"

export async function verifyTechnicalTeamAuth(request: NextRequest): Promise<{
  success: boolean
  technical?: AuthenticatedTechnicalUser
  error?: string
}> {
  const result = await validateTechnicalAuth(request)

  return {
    success: result.success,
    technical: result.user,
    error: result.error,
  }
}

export type { AuthenticatedTechnicalUser }
