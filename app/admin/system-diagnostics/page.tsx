"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react"

export default function SystemDiagnosticsPage() {
  const [fixing, setFixing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fixAttendanceConstraint = async () => {
    setFixing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/fix-attendance-constraint?adminKey=emergency-fix-attendance", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to fix constraint")
        return
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">System Diagnostics & Fixes</h1>
        <p className="text-slate-400 mb-8">Database maintenance tools for administrators</p>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Personnel Attendance Constraint Fix</CardTitle>
            <CardDescription>
              Fixes the database constraint to allow all user types (admin_personnel, accounts_personnel, technical_team, peon) to mark attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300">
              <p className="mb-2 font-semibold">Issue:</p>
              <p>
                The personnel_attendance table constraint was restricting certain user types from marking attendance. This fix updates the constraint to allow all staff types.
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-300 mb-2">Allowed User Types:</p>
              <div className="flex flex-wrap gap-2">
                {["admin_personnel", "accounts_personnel", "technical_team", "peon"].map((type) => (
                  <span key={type} className="bg-blue-900 text-blue-100 px-3 py-1 rounded-full text-xs font-medium">
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <Alert className="bg-red-900 border-red-700">
                <AlertTriangle className="h-4 w-4 text-red-200" />
                <AlertDescription className="text-red-100">{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="bg-green-900 border-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-200" />
                <AlertDescription className="text-green-100">
                  <p className="font-semibold mb-1">{result.message}</p>
                  {result.details && (
                    <p className="text-sm">
                      Status: <span className="font-mono bg-green-800 px-2 py-1 rounded">{result.details.status}</span>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={fixAttendanceConstraint}
              disabled={fixing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {fixing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Fix
                </>
              )}
            </Button>

            <p className="text-xs text-slate-400">
              This operation is safe and will only update the database constraint definition to allow the correct user types.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Next Steps:</h3>
          <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
            <li>Click "Run Fix" to apply the attendance constraint fix</li>
            <li>Once fixed, users should be able to mark attendance immediately</li>
            <li>Ask admin_personnel, accounts_personnel, and technical_team users to try marking attendance again</li>
            <li>The peon user's history should also load properly now</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
