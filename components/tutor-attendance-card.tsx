"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface AttendanceStatus {
  marked: boolean
  status?: string
  markedAt?: string
  message?: string
}

export function TutorAttendanceCard({ tutorId }: { tutorId: number }) {
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Fetch attendance status on component mount
  useEffect(() => {
    fetchAttendanceStatus()
  }, [tutorId])

  const fetchAttendanceStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tutor/attendance/status?tutorId=${tutorId}`)
      const data = await response.json()

      if (data.success) {
        setAttendanceStatus(data)
      } else {
        setError(data.message || "Failed to fetch attendance status")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAttendance = async () => {
    setMarking(true)
    setError("")
    setSuccess("")

    try {
      // Get device info
      const deviceInfo = `${navigator.userAgent.substring(0, 100)}`

      // Request geolocation
      if (!navigator.geolocation) {
        setError("Location access is required to mark attendance.")
        setMarking(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords

            // Call API to mark attendance
            const response = await fetch("/api/tutor/attendance/mark", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tutorId,
                latitude,
                longitude,
                deviceInfo,
              }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
              setSuccess("Attendance marked successfully ✓")
              setAttendanceStatus({
                marked: true,
                status: "present",
                markedAt: new Date().toISOString(),
              })
              setTimeout(() => setSuccess(""), 3000)
            } else {
              setError(data.message || "Failed to mark attendance")
            }
          } catch (err) {
            setError("Network error. Please try again.")
          } finally {
            setMarking(false)
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setError("Location access is required to mark attendance.")
          } else {
            setError("Unable to get your location. Please check your device settings.")
          }
          setMarking(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    } catch (err) {
      setError("Failed to process attendance. Please try again.")
      setMarking(false)
    }
  }

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    } catch {
      return ""
    }
  }

  return (
    <Card className="col-span-1 border-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Self Attendance
            </CardTitle>
            <CardDescription>Mark your presence on campus</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          </div>
        ) : (
          <>
            {attendanceStatus?.marked && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">Present</span>
                  </div>
                  <Badge variant="default" className="bg-green-600">
                    Marked
                  </Badge>
                </div>
                {attendanceStatus.markedAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <Clock className="h-4 w-4" />
                    <span>Marked at: {formatTime(attendanceStatus.markedAt)}</span>
                  </div>
                )}
              </div>
            )}

            {!attendanceStatus?.marked && (
              <div className="space-y-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-700 dark:text-orange-400 text-sm">
                      Not Marked
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                      Click the button below to mark your attendance
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-300 bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {!attendanceStatus?.marked && (
              <Button
                onClick={handleMarkAttendance}
                disabled={marking || attendanceStatus?.marked}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-semibold gap-2"
              >
                {marking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Mark Present
                  </>
                )}
              </Button>
            )}

            {attendanceStatus?.marked && (
              <Button disabled className="w-full bg-green-600 text-white h-11 rounded-lg font-semibold">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Attendance Marked
              </Button>
            )}
          </>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="flex items-start gap-2">
            <span>📍</span>
            <span>
              You can mark attendance only when you are within 100 meters of the college campus. Real GPS
              location is required.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
