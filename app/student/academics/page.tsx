"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ArrowRight, LogOut, Check, X, Clock, BarChart3, Users, Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Subject {
  id: number
  name: string
  code: string
  course_name: string
  semester: number
  tutor_name: string
  tutor_department: string
}

interface AttendanceRecord {
  id: number
  title: string
  description: string | null
  lecture_date: string
  status: string | null
  tutor_name: string
  subject_name: string
}

interface Student {
  id: number
  full_name: string
  enrollment_number: string
}

interface Stats {
  total: number
  present: number
  absent: number
  notMarked: number
}

function AttendanceModal({
  isOpen,
  onClose,
  subjectName,
  attendance,
}: {
  isOpen: boolean
  onClose: () => void
  subjectName: string | null
  attendance: AttendanceRecord[]
}) {
  if (!isOpen || !subjectName) return null

  const filteredAttendance = attendance.filter((record) => record.subject_name === subjectName)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="border-b border-border/50 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{subjectName}</h2>
            <p className="text-sm text-muted-foreground mt-1">Attendance Records</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAttendance.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No lecture records found for {subjectName}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAttendance.map((record) => {
                const statusColor =
                  record.status === "Present"
                    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    : record.status === "Absent"
                      ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                      : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"

                const statusIcon =
                  record.status === "Present" ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : record.status === "Absent" ? (
                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  )

                return (
                  <div
                    key={record.id}
                    className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${statusColor}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base text-foreground">{record.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {record.tutor_name}
                          </Badge>
                        </div>
                        {record.description && <p className="text-sm text-muted-foreground">{record.description}</p>}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(record.lecture_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {statusIcon}
                        <Badge
                          variant={
                            record.status === "Present"
                              ? "default"
                              : record.status === "Absent"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {record.status || "Not Marked"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border/50 p-6">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function StudentAcademicsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [student, setStudent] = useState<Student | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, notMarked: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const studentAuth = localStorage.getItem("studentAuth")
    if (!studentAuth) {
      router.push("/student/login")
      return
    }

    try {
      const studentData = JSON.parse(studentAuth)
      setStudent(studentData)
      fetchData(studentData.id)
    } catch (error) {
      console.error("Failed to parse student auth:", error)
      localStorage.removeItem("studentAuth")
      router.push("/student/login")
    }
  }, [router])

  const fetchData = async (studentId: number) => {
    try {
      // Fetch subjects
      const subjectsResponse = await fetch(`/api/student/subjects?studentId=${studentId}`)
      const subjectsData = await subjectsResponse.json()
      if (subjectsData.success) {
        setSubjects(subjectsData.subjects)
      }

      // Fetch all attendance data
      const attendanceResponse = await fetch(`/api/student/academics/attendance?studentId=${studentId}`)
      const attendanceData = await attendanceResponse.json()
      if (attendanceData.success) {
        setAllAttendance(attendanceData.attendance)
        setStats(attendanceData.stats)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ title: "Error", description: "Failed to fetch academic data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("studentAuth")
    toast({ title: "Success", description: "Logged out successfully" })
    router.push("/student/login")
  }

  const handleViewAttendance = (subjectName: string) => {
    setSelectedSubject(subjectName)
    setIsModalOpen(true)
  }

  const attendancePercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading academic data...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">My Academics</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {student.full_name} • {student.enrollment_number}
            </p>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="gap-2 w-full sm:w-auto">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Attendance Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="stat-card">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="metric-label">Total Lectures</p>
                <BookOpen className="w-4 h-4 text-primary/60" />
              </div>
              <p className="metric-value">{stats.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="metric-label">Present</p>
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="metric-label">Absent</p>
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="metric-label">Attendance</p>
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{attendancePercentage}%</p>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Your Subjects</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {subjects.length} {subjects.length === 1 ? "subject" : "subjects"} enrolled
            </p>
          </div>

          {subjects.length === 0 ? (
            <Card className="admin-card">
              <CardContent className="p-8 sm:p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No subjects found for your current semester.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="group admin-card flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
                >
                  {/* Card Header with Subject Code Badge */}
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-border/50">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{subject.code}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2 flex-shrink-0">
                      S{subject.semester}
                    </Badge>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 space-y-4">
                    {/* Course Info */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Award className="w-4 h-4 text-primary/60 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Course</p>
                          <p className="text-sm text-foreground font-medium truncate">{subject.course_name}</p>
                        </div>
                      </div>

                      {/* Faculty Info */}
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 text-primary/60 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faculty</p>
                          <p className="text-sm text-foreground font-medium truncate">{subject.tutor_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{subject.tutor_department}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer with Action Button */}
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <Button
                      onClick={() => handleViewAttendance(subject.name)}
                      className="w-full admin-button gap-2 text-sm"
                    >
                      View Attendance
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subjectName={selectedSubject}
        attendance={allAttendance}
      />
    </div>
  )
}
