"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, X, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AttendanceRecord {
  id: number
  title: string
  description: string | null
  lecture_date: string
  status: string | null
  tutor_name: string
}

interface Stats {
  total: number
  present: number
  absent: number
  notMarked: number
}

export default function StudentAttendancePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const subjectId = params.subjectId as string
  const [student, setStudent] = useState<any>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, notMarked: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const studentAuth = localStorage.getItem("studentAuth")
    if (!studentAuth) {
      router.push("/student/login")
      return
    }

    try {
      const studentData = JSON.parse(studentAuth)
      setStudent(studentData)
      fetchAttendance(studentData.id)
    } catch (error) {
      console.error("Failed to parse student auth:", error)
      localStorage.removeItem("studentAuth")
      router.push("/student/login")
    }
  }, [router, subjectId])

  const fetchAttendance = async (studentId: number) => {
    try {
      const response = await fetch(`/api/student/subjects/${subjectId}/attendance?studentId=${studentId}`)
      const data = await response.json()
      if (data.success) {
        setAttendance(data.attendance)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching attendance:", error)
      toast({ title: "Error", description: "Failed to fetch attendance", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getAttendanceColor = (status: string | null) => {
    if (status === "Present") return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
    if (status === "Absent") return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
    return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
  }

  const getStatusIcon = (status: string | null) => {
    if (status === "Present") return <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
    if (status === "Absent") return <X className="w-5 h-5 text-red-600 dark:text-red-400" />
    return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
  }

  const attendancePercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/student/subjects">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Attendance Record
            </h1>
            <p className="text-lg text-muted-foreground">View your lecture attendance for this subject</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Lectures</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Present</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Absent</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Attendance %</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{attendancePercentage}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Lecture Details</CardTitle>
            <CardDescription>Your attendance status for each lecture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {attendance.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No lectures found for this subject.</p>
              ) : (
                attendance.map((record) => (
                  <div
                    key={record.id}
                    className={`p-4 border rounded-lg transition-colors ${getAttendanceColor(record.status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{record.title}</p>
                        {record.description && (
                          <p className="text-sm text-muted-foreground mt-1">{record.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(record.lecture_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <Badge
                          variant={
                            record.status === "Present"
                              ? "default"
                              : record.status === "Absent"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {record.status || "Not Marked"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
