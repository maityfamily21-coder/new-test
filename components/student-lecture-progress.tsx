"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { TrendingUp, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface LectureAttendance {
  id: number
  title: string
  subject_name: string
  tutor_name: string
  lecture_date: string
  status: "Present" | "Absent" | null
}

interface AttendanceStats {
  total: number
  present: number
  absent: number
  notMarked: number
}

interface StudentLectureProgressProps {
  studentId: number
  authHeaders: Record<string, string>
}

export function StudentLectureProgress({ studentId, authHeaders }: StudentLectureProgressProps) {
  const [lectures, setLectures] = useState<LectureAttendance[]>([])
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, notMarked: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attendancePercentage, setAttendancePercentage] = useState(0)
  const [grade, setGrade] = useState({ letter: "—", color: "text-gray-500", bgColor: "bg-gray-500" })
  const [todayLectures, setTodayLectures] = useState<LectureAttendance[]>([])

  useEffect(() => {
    fetchLectureAttendance()
  }, [studentId])

  const fetchLectureAttendance = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/student/academics/attendance?studentId=${studentId}`, {
        headers: authHeaders,
      })

      if (!response.ok) {
        throw new Error("Failed to fetch attendance data")
      }

      const data = await response.json()

      if (data.success) {
        setLectures(data.attendance || [])
        setStats(data.stats)

        // Calculate today's lectures
        const today = new Date().toLocaleDateString("en-IN")
        const filteredTodayLectures = (data.attendance || []).filter((lecture: LectureAttendance) => {
          const lectureDate = new Date(lecture.lecture_date).toLocaleDateString("en-IN")
          return lectureDate === today
        })
        setTodayLectures(filteredTodayLectures)

        // Calculate attendance percentage
        if (data.stats.total > 0) {
          const percentage = Math.round((data.stats.present / data.stats.total) * 100)
          setAttendancePercentage(percentage)
          calculateGrade(percentage)
        }
      } else {
        setError("Unable to load attendance data")
      }
    } catch (err) {
      console.error("Error fetching lecture attendance:", err)
      setError("Failed to load attendance information")
    } finally {
      setLoading(false)
    }
  }

  const calculateGrade = (percentage: number) => {
    let letter = "—"
    let color = "text-gray-500"
    let bgColor = "bg-gray-500"

    if (percentage >= 81) {
      letter = "A"
      color = "text-green-600"
      bgColor = "bg-green-500"
    } else if (percentage >= 61) {
      letter = "B"
      color = "text-blue-600"
      bgColor = "bg-blue-500"
    } else if (percentage >= 41) {
      letter = "C"
      color = "text-yellow-600"
      bgColor = "bg-yellow-500"
    } else if (percentage >= 21) {
      letter = "D"
      color = "text-orange-600"
      bgColor = "bg-orange-500"
    } else {
      letter = "F"
      color = "text-red-600"
      bgColor = "bg-red-500"
    }

    setGrade({ letter, color, bgColor })
  }

  const getAttendanceStatusBadge = (status: "Present" | "Absent" | null) => {
    if (status === "Present") {
      return (
        <Badge className="bg-green-500/20 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Present
        </Badge>
      )
    } else if (status === "Absent") {
      return (
        <Badge className="bg-red-500/20 text-red-700 border-red-200 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Absent
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Not Marked
        </Badge>
      )
    }
  }

  const pieChartData = [
    { name: "Present", value: stats.present, fill: "#10b981" },
    { name: "Absent", value: stats.absent, fill: "#ef4444" },
    { name: "Not Marked", value: stats.notMarked, fill: "#eab308" },
  ].filter((item) => item.value > 0)

  const barChartData = [
    { name: "Present", value: stats.present, fill: "#10b981" },
    { name: "Absent", value: stats.absent, fill: "#ef4444" },
    { name: "Not Marked", value: stats.notMarked, fill: "#eab308" },
  ]

  if (loading) {
    return (
      <Card className="admin-card lg:col-span-2">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Lecture Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading attendance data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="admin-card lg:col-span-2">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Lecture Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="admin-card lg:col-span-2">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Lecture Progress & Attendance</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Your lecture attendance tracking and performance metrics
            </CardDescription>
          </div>
          <div className={`text-center p-3 rounded-lg border-2 ${grade.bgColor}/20 border-${grade.bgColor}`}>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Grade</p>
            <p className={`text-3xl font-bold ${grade.color}`}>{grade.letter}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Today's Lectures */}
        {todayLectures.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center">
                <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                Today's Lectures ({todayLectures.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todayLectures.map((lecture) => (
                <div
                  key={lecture.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{lecture.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{lecture.subject_name}</p>
                      <p className="text-xs text-muted-foreground">by {lecture.tutor_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(lecture.lecture_date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {getAttendanceStatusBadge(lecture.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Overview */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center">
              <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
              Overall Attendance Overview
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="text-center space-y-1 p-3 sm:p-4 border rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-blue-500">{stats.total}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Lectures</p>
            </div>
            <div className="text-center space-y-1 p-3 sm:p-4 border rounded-lg bg-green-500/5">
              <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.present}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Present</p>
            </div>
            <div className="text-center space-y-1 p-3 sm:p-4 border rounded-lg bg-red-500/5">
              <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Absent</p>
            </div>
            <div className="text-center space-y-1 p-3 sm:p-4 border rounded-lg bg-yellow-500/5">
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.notMarked}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Not Marked</p>
            </div>
          </div>

          {/* Attendance Percentage */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Lecture Attendance Percentage</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                  {stats.total > 0
                    ? "Based on lectures with marked attendance"
                    : "No lecture attendance data available yet"}
                </p>
              </div>
              {stats.total > 0 && (
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{attendancePercentage}%</p>
                </div>
              )}
            </div>
            {stats.total > 0 && (
              <div className="mt-3 w-full bg-blue-200/30 dark:bg-blue-900/30 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-500"
                  style={{ width: `${attendancePercentage}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center">
                <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                Attendance Distribution
              </h3>
              <div className="h-64 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} lectures`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center">
                <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                Attendance Breakdown
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Grade Info */}
        {stats.total > 0 && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <h3 className="text-sm font-semibold">Grade Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="text-center p-2 rounded bg-red-500/10">
                <p className="font-semibold text-red-700">F</p>
                <p className="text-muted-foreground">0–20%</p>
              </div>
              <div className="text-center p-2 rounded bg-orange-500/10">
                <p className="font-semibold text-orange-700">D</p>
                <p className="text-muted-foreground">21–40%</p>
              </div>
              <div className="text-center p-2 rounded bg-yellow-500/10">
                <p className="font-semibold text-yellow-700">C</p>
                <p className="text-muted-foreground">41–60%</p>
              </div>
              <div className="text-center p-2 rounded bg-blue-500/10">
                <p className="font-semibold text-blue-700">B</p>
                <p className="text-muted-foreground">61–80%</p>
              </div>
              <div className="text-center p-2 rounded bg-green-500/10">
                <p className="font-semibold text-green-700">A</p>
                <p className="text-muted-foreground">81–100%</p>
              </div>
            </div>
          </div>
        )}

        {stats.total === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No lecture attendance records found for your current semester.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
