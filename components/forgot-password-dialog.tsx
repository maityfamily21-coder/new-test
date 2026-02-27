"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react"

export type ForgotPasswordUserType = "student" | "admin" | "tutor" | "technical" | "administrative_personnel" | "accounts_personnel" | "peon"

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userType: ForgotPasswordUserType
  identityFieldLabel: string // "Enrollment Number" or "Username"
  identityFieldPlaceholder: string
  onSuccess?: () => void
}

type Step = "request-otp" | "verify-otp" | "success"

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  userType,
  identityFieldLabel,
  identityFieldPlaceholder,
  onSuccess,
}: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<Step>("request-otp")
  const [identityValue, setIdentityValue] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [tokenId, setTokenId] = useState<number | null>(null)

  const resetDialog = () => {
    setStep("request-otp")
    setIdentityValue("")
    setOtp("")
    setNewPassword("")
    setLoading(false)
    setError("")
    setSuccess("")
    setTokenId(null)
  }

  const handleClose = () => {
    resetDialog()
    onOpenChange(false)
  }

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/${userType}/forgot-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentNumber: identityValue, username: identityValue }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("OTP sent successfully!")
        setTimeout(() => {
          setSuccess("")
          setStep("verify-otp")
        }, 1500)
      } else {
        setError(data.message || "Failed to send OTP")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP and Auto-Generate Password
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (otp.length !== 6) {
      setError("OTP must be 6 digits")
      setLoading(false)
      return
    }

    try {
      // First verify OTP
      const verifyResponse = await fetch(`/api/${userType}/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, enrollmentNumber: identityValue, username: identityValue }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok || !verifyData.tokenId) {
        setError(verifyData.message || "Invalid OTP")
        setLoading(false)
        return
      }

      setTokenId(verifyData.tokenId)
      setSuccess("OTP verified! Generating new password...")
      setLoading(false)

      // Immediately after verification, generate and send the password
      setTimeout(async () => {
        try {
          setLoading(true)
          const resetResponse = await fetch(`/api/${userType}/forgot-password/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenId: verifyData.tokenId, enrollmentNumber: identityValue, username: identityValue }),
          })

          const resetData = await resetResponse.json()

          if (resetResponse.ok && resetData.newPassword) {
            setNewPassword(resetData.newPassword)
            setSuccess("New password sent to your email! ✓")
            setError("")
            setTimeout(() => {
              setStep("success")
              setSuccess("")
              setLoading(false)
            }, 2000)
          } else {
            setError(resetData.message || "Failed to generate password")
            setLoading(false)
          }
        } catch (err) {
          console.error("[v0] Password generation error:", err)
          setError("Network error. Please try again.")
          setLoading(false)
        }
      }, 800)
    } catch (err) {
      setError("Network error. Please try again.")
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (!tokenId) {
      setError("Invalid session. Please start over.")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/${userType}/forgot-password/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, enrollmentNumber: identityValue, username: identityValue }),
      })

      const data = await response.json()

      if (response.ok && data.newPassword) {
        setSuccess(`Password reset successful!\nYour new password is: ${data.newPassword}`)
        setNewPassword(data.newPassword)
        setTimeout(() => {
          setStep("success")
        }, 2000)
      } else {
        setError(data.message || "Failed to reset password")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Reset Your Password</DialogTitle>
          <DialogDescription>
            {step === "request-otp" && "Enter your credentials to receive a password reset OTP"}
            {step === "verify-otp" && "Enter the OTP sent to your registered email"}
            {step === "success" && "Password reset completed successfully"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Request OTP */}
          {step === "request-otp" && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identity">{identityFieldLabel}</Label>
                <Input
                  id="identity"
                  placeholder={identityFieldPlaceholder}
                  value={identityValue}
                  onChange={(e) => setIdentityValue(e.target.value)}
                  disabled={loading}
                  required
                  className="h-10"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !identityValue} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === "verify-otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP (6 digits)</Label>
                <Input
                  id="otp"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading}
                  required
                  maxLength={6}
                  className="h-10 font-mono text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  OTP valid for 5 minutes. Check your registered email.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("request-otp")}
                  className="flex-1"
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading || otp.length !== 6} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Password Reset Successful!</h3>
              <div className="bg-gray-100 p-4 rounded-lg font-mono break-all">
                <p className="text-sm font-bold">{newPassword}</p>
              </div>
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-sm">
                  A confirmation email has been sent. Save your password somewhere safe. You can change it after logging in.
                </AlertDescription>
              </Alert>
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
