"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Smartphone, AlertTriangle, CheckCircle2 } from "lucide-react"
import { generateDeviceFingerprint } from "@/lib/device-fingerprint"

interface DeviceStats {
  fingerprint: string
  hashedFingerprint: string
  todayStatus: {
    usedToday: boolean
    marksToday: number
    maxAllowed: number
    canUseToday: boolean
  }
  statistics: {
    totalMarks: number
    daysUsed: number
    firstUsed: string | null
    lastUsed: string | null
    averageMarksPerDay: number | string
  }
  warning: string | null
}

export function DeviceInfoDisplay({ tutorId }: { tutorId: number }) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        setLoading(true)
        const fingerprint = generateDeviceFingerprint()

        const params = new URLSearchParams({
          tutorId: tutorId.toString(),
          deviceFingerprint: fingerprint.fingerprint,
        })

        const response = await fetch(`/api/tutor/attendance/device-info?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setDeviceInfo(data)
        } else {
          setError(data.message || "Failed to fetch device info")
        }
      } catch (err) {
        console.error("[v0] Error fetching device info:", err)
        setError("Failed to fetch device information")
      } finally {
        setLoading(false)
      }
    }

    fetchDeviceInfo()
  }, [tutorId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !deviceInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error || "Failed to load device information"}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    try {
      return new Date(dateStr).toLocaleDateString("en-IN")
    } catch {
      return "Unknown"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Device Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Status */}
        <div className={`p-3 rounded-lg flex items-start gap-3 ${
          deviceInfo.todayStatus.canUseToday
            ? "bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : "bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
        }`}>
          {deviceInfo.todayStatus.canUseToday ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="text-xs">
            <p className={`font-semibold ${
              deviceInfo.todayStatus.canUseToday
                ? "text-green-700 dark:text-green-300"
                : "text-orange-700 dark:text-orange-300"
            }`}>
              {deviceInfo.todayStatus.canUseToday
                ? "Device Available"
                : "Device Already Used Today"}
            </p>
            <p className={`opacity-80 mt-0.5 ${
              deviceInfo.todayStatus.canUseToday
                ? "text-green-600 dark:text-green-400"
                : "text-orange-600 dark:text-orange-400"
            }`}>
              {deviceInfo.todayStatus.marksToday}/{deviceInfo.todayStatus.maxAllowed} marks used
            </p>
          </div>
        </div>

        {/* Warning if applicable */}
        {deviceInfo.warning && (
          <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-xs">
              {deviceInfo.warning}
            </AlertDescription>
          </Alert>
        )}

        {/* Device Stats */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/20 rounded">
            <span className="text-gray-600 dark:text-gray-400">Total Marks</span>
            <Badge variant="outline">{deviceInfo.statistics.totalMarks}</Badge>
          </div>

          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/20 rounded">
            <span className="text-gray-600 dark:text-gray-400">Days Used</span>
            <Badge variant="outline">{deviceInfo.statistics.daysUsed}</Badge>
          </div>

          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/20 rounded">
            <span className="text-gray-600 dark:text-gray-400">Avg Marks/Day</span>
            <Badge variant="outline">
              {deviceInfo.statistics.averageMarksPerDay.toString().substring(0, 4)}
            </Badge>
          </div>
        </div>

        {/* Last Used */}
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-xs">
          <p className="text-gray-600 dark:text-gray-400 font-semibold mb-1">Usage History</p>
          <p className="text-gray-700 dark:text-gray-300">
            First Used: {formatDate(deviceInfo.statistics.firstUsed)}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Last Used: {formatDate(deviceInfo.statistics.lastUsed)}
          </p>
        </div>

        {/* Device ID (Truncated) */}
        <div className="text-xs text-gray-500 dark:text-gray-500 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono break-all">
          Device: {deviceInfo.fingerprint}
        </div>
      </CardContent>
    </Card>
  )
}
