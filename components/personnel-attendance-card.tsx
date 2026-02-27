"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  MapPinOff,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { generateDeviceFingerprint } from "@/lib/device-fingerprint"
import { PersonnelAttendanceHistoryModal } from "./personnel-attendance-history-modal"

interface AttendanceStatusSummary {
  text: string
  marksToday: number
  maxAllowed: number
  remainingMarks: number
  canMark: boolean
  reason: string
}

interface LocationStatus {
  isInside: boolean
  campusInfo: {
    name: string
    distance: number
    isInside: boolean
  } | null
}

interface AttendanceStatus {
  statusSummary: AttendanceStatusSummary
  locationStatus: LocationStatus
  attendanceMarks: any[]
  details: {
    date: string
    totalMarked: number
    firstMark: string | null
    lastMark: string | null
  }
}

export function PersonnelAttendanceCard({
  personnelId,
  userType,
}: {
  personnelId: number
  userType: string
}) {
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [locationWatcher, setLocationWatcher] = useState<number | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Fetch attendance status
  const fetchAttendanceStatus = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        personnelId: personnelId.toString(),
        userType: userType,
      })

      // Add location params if available
      if (currentLocation) {
        params.append("latitude", currentLocation.latitude.toString())
        params.append("longitude", currentLocation.longitude.toString())
      }

      const response = await fetch(`/api/personnel/attendance/status?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setAttendanceStatus(data)
      } else {
        setError(data.message || "Failed to fetch status")
      }
    } catch (err) {
      console.error("[v0] Error fetching status:", err)
    } finally {
      setLoading(false)
    }
  }, [personnelId, userType, currentLocation])

  // Initialize location watching
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.")
      return
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCurrentLocation({ latitude, longitude })
      },
      () => {
        console.log("[v0] Initial location fetch failed, will try again")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    // Watch position for real-time updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCurrentLocation({ latitude, longitude })
      },
      (err) => {
        if (err.code !== err.PERMISSION_DENIED) {
          console.log("[v0] Location watch error:", err)
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    setLocationWatcher(watchId)

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [])

  // Auto-refresh status every 10 seconds, but pause when buttons are clicked
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  useEffect(() => {
    fetchAttendanceStatus()
    let interval: any = null

    if (autoRefreshEnabled) {
      interval = setInterval(fetchAttendanceStatus, 10000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fetchAttendanceStatus, autoRefreshEnabled])

  const handleMarkAttendance = async () => {
    setMarking(true)
    setAutoRefreshEnabled(false)
    setError("")
    setSuccess("")

    try {
      if (!currentLocation) {
        setError("Unable to get your location. Please check location permissions.")
        setMarking(false)
        setAutoRefreshEnabled(true)
        return
      }

      const { latitude, longitude } = currentLocation
      const deviceInfo = generateDeviceFingerprint()

      const response = await fetch("/api/personnel/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personnelId,
          userType,
          latitude,
          longitude,
          deviceFingerprint: deviceInfo.fingerprint,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(
          `${data.attendance.attendance_type} marked successfully at ${data.attendance.campus_location}!`
        )
        await fetchAttendanceStatus()
        setTimeout(() => setSuccess(""), 4000)
      } else {
        setError(data.message || "Failed to mark attendance")
      }
    } catch (err) {
      console.error("[v0] Error marking attendance:", err)
      setError("Network error. Please try again.")
    } finally {
      setMarking(false)
      setAutoRefreshEnabled(true)
    }
  }

  const getStatusColor = (status: string) => {
    if (status === "Completed") return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
    if (status === "Marked Once") return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
  }

  const getStatusIcon = (status: string) => {
    if (status === "Completed") return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (status === "Marked Once") return <Clock className="h-5 w-5 text-blue-600" />
    return <AlertCircle className="h-5 w-5 text-orange-600" />
  }

  const isInsideArea = attendanceStatus?.locationStatus.isInside ?? false
  const canMark = attendanceStatus?.statusSummary.canMark ?? false
  const remainingMarks = attendanceStatus?.statusSummary.remainingMarks ?? 0
  const statusText = attendanceStatus?.statusSummary.text ?? "Loading..."
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    setAutoRefreshEnabled(false)
    await fetchAttendanceStatus()
    setLastRefresh(new Date())
    setIsRefreshing(false)
    // Re-enable auto-refresh after 5 seconds
    setTimeout(() => setAutoRefreshEnabled(true), 5000)
  }
  const marksToday = attendanceStatus?.statusSummary.marksToday ?? 0
  const maxAllowed = attendanceStatus?.statusSummary.maxAllowed ?? 2

  return (
    <>
      <Card className="col-span-1 border-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Mark Attendance
              </CardTitle>
              <CardDescription>Location-based attendance marking with device security</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-xs"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="text-xs"
              >
                History
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Summary Card */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
            </div>
          ) : (
            <>
              {/* Main Status */}
              <div className={`p-4 rounded-lg flex items-start justify-between ${getStatusColor(statusText)}`}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(statusText)}
                  <div>
                    <p className="font-semibold text-sm">{statusText}</p>
                    <p className="text-xs opacity-80">
                      {marksToday}/{maxAllowed} marks completed
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-slate-700">
                  {remainingMarks} left
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium">Daily Progress</span>
                  <span className="text-gray-600 dark:text-gray-400">{marksToday}/{maxAllowed}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(marksToday / maxAllowed) * 100}%` }}
                  />
                </div>
              </div>

              {/* Location Status */}
              <div className={`p-3 rounded-lg flex items-start gap-2 ${
                isInsideArea
                  ? "bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700"
                  : "bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700"
              }`}>
                {isInsideArea ? (
                  <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <MapPinOff className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 text-xs">
                  <p className={`font-semibold ${isInsideArea ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                    {isInsideArea ? "Inside Authorized Area" : "Outside Authorized Area"}
                  </p>
                  {attendanceStatus?.locationStatus.campusInfo && (
                    <p className={`opacity-80 mt-0.5 ${isInsideArea ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {attendanceStatus.locationStatus.campusInfo.name} -{" "}
                      {Math.round(attendanceStatus.locationStatus.campusInfo.distance)}m away
                    </p>
                  )}
                </div>
              </div>

              {/* Attendance Marks Today */}
              {marksToday > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Today's Marks:</p>
                  {attendanceStatus?.attendanceMarks.map((mark: any, idx: number) => (
                    <div
                      key={mark.id}
                      className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {mark.type}
                        </Badge>
                        <span className="text-gray-600 dark:text-gray-400">{mark.campus}</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-500">
                        {new Date(mark.markedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-700 dark:text-red-300 text-xs">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-300 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300 text-xs">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {/* Mark Button */}
              <Button
                onClick={handleMarkAttendance}
                disabled={!canMark || marking || marksToday >= maxAllowed}
                className={`w-full h-11 rounded-lg font-semibold gap-2 ${
                  canMark && marksToday < maxAllowed
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    : "bg-gray-400 dark:bg-gray-600"
                }`}
              >
                {marking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : canMark && marksToday < maxAllowed ? (
                  <>
                    <MapPin className="h-4 w-4" />
                    Mark {marksToday === 0 ? "Entry" : "Exit"}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Attendance Complete
                  </>
                )}
              </Button>

              {!canMark && marksToday < maxAllowed && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center">
                  {!isInsideArea
                    ? "You must be inside an authorized campus area to mark attendance"
                    : "Unable to mark attendance at this time"}
                </p>
              )}

              {/* Info Box */}
              <div className="text-xs text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="space-y-1">
                  <span className="block font-semibold text-blue-700 dark:text-blue-300 mb-1">
                    How it works:
                  </span>
                  <span className="block">• Mark Entry when arriving at campus</span>
                  <span className="block">• Mark Exit when leaving campus</span>
                  <span className="block">• One device per day allowed</span>
                  <span className="block">• Must be within 100m of authorized area</span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* History Modal */}
      <PersonnelAttendanceHistoryModal
        personnelId={personnelId}
        userType={userType}
        isOpen={showHistory}
        onClose={() => {
          setShowHistory(false)
          setAutoRefreshEnabled(true)
        }}
        onOpen={() => setAutoRefreshEnabled(false)}
      />
    </>
  )
}
